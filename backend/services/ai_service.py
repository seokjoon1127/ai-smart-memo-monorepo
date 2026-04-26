from __future__ import annotations

import json
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Sequence
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from schemas import (
    EventType,
    Note,
    RelatedDoc,
    Schedule,
    ShareDocDetail,
    Suggestion,
    SuggestionType,
)
from services.db_handler import FAISS_DIR, ID_MAP_PATH, INDEX_PATH

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

KST = ZoneInfo("Asia/Seoul")
EMBEDDING_DIM = 768
RELATED_DOC_THRESHOLD = 0.5

RERANK_CANDIDATE_MULTIPLIER = 5
MAX_RERANK_BONUS = 0.10

PERSON_TITLE_TAG_BONUS = 0.05
PERSON_BODY_BONUS = 0.03
TITLE_KEYWORD_TITLE_TAG_BONUS = 0.03
TITLE_KEYWORD_BODY_BONUS = 0.02
CATEGORY_MATCH_BONUS = 0.02

GENERIC_TITLE_WORDS = {
    "회의",
    "미팅",
    "스탠드업",
    "면담",
    "보고서",
    "제출",
    "마감",
    "일정",
    "업무",
}

try:
    import numpy as np
except ImportError:
    np = None

try:
    import faiss
except ImportError:
    faiss = None

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None


class AIServiceUnavailable(RuntimeError):
    """Gemini 또는 FAISS 관련 기능을 사용할 수 없을 때 발생."""


class ExtractedEvent(BaseModel):
    title: str
    date: str
    is_all_day: bool
    start_time: str | None = None
    end_time: str | None = None
    type: EventType
    participants: list[str] = Field(default_factory=list)
    location: str | None = None


class ExtractedEventEnvelope(BaseModel):
    events: list[ExtractedEvent] = Field(default_factory=list)


class SuggestionDraft(BaseModel):
    type: SuggestionType = "follow_up_meeting"
    title: str
    suggested_date: str
    suggested_start_time: str | None = None
    reason: str


def parse_note_content(content: str) -> list[ExtractedEvent]:
    client = _build_client()
    model = _get_required_env("GEMINI_MODEL")
    today = datetime.now(KST).date().isoformat()

    prompt = f"""
You extract schedule candidates from a Korean memo.

Today is {today} in Asia/Seoul.

Return only JSON matching this schema:
{{
  "events": [
    {{
      "title": "string",
      "date": "YYYY-MM-DD",
      "is_all_day": true,
      "start_time": "HH:MM or null",
      "end_time": "HH:MM or null",
      "type": "meeting | deadline | event | other",
      "participants": ["string"],
      "location": "string or null"
    }}
  ]
}}

Rules:
- If there is no schedule information, return {{"events": []}}.
- Convert relative Korean dates such as 오늘, 내일, 모레, 이번주, 다음주 into absolute YYYY-MM-DD using today.
- If no time is explicitly mentioned, set is_all_day=true, start_time=null, end_time=null.
- If a start time is mentioned, set is_all_day=false and start_time in HH:MM.
- If an end time is not explicitly mentioned, set end_time=null. Do not infer an end time.
- If participants are not explicitly mentioned, use [].
- If location is not explicitly mentioned, use null. Do not infer a location.
- Map event type:
  - 회의, 미팅, 스탠드업, 면담 -> meeting
  - 마감, 제출, 데드라인 -> deadline
  - any other memo with an explicit time -> event
  - no explicit time and no deadline/meeting keyword -> other

Memo:
{content}
""".strip()

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ExtractedEventEnvelope,
            temperature=0,
        ),
    )

    parsed = _coerce_parsed_response(response, ExtractedEventEnvelope)
    return parsed.events


def rebuild_share_doc_index(
    docs: Sequence[ShareDocDetail],
) -> list[ShareDocDetail]:
    FAISS_DIR.mkdir(parents=True, exist_ok=True)

    docs_list = list(docs)
    if not docs_list:
        _write_empty_index_files()
        return []

    if faiss is None or np is None:
        _write_empty_index_files()
        return [doc.model_copy(update={"indexed": False}) for doc in docs_list]

    try:
        embeddings = _embed_texts(
            [_share_doc_embedding_text(doc) for doc in docs_list],
            task_type="RETRIEVAL_DOCUMENT",
        )
    except AIServiceUnavailable:
        _write_empty_index_files()
        return [doc.model_copy(update={"indexed": False}) for doc in docs_list]

    if len(embeddings) != len(docs_list):
        _write_empty_index_files()
        return [doc.model_copy(update={"indexed": False}) for doc in docs_list]

    vectors = np.asarray(embeddings, dtype="float32")
    if vectors.ndim != 2 or vectors.shape[1] != EMBEDDING_DIM:
        raise ValueError("Unexpected embedding dimension")

    vectors = _normalize_vectors(vectors)

    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(vectors)
    faiss.write_index(index, str(INDEX_PATH))

    id_map = [
        {
            "faiss_row": row,
            "doc_id": doc.id,
        }
        for row, doc in enumerate(docs_list)
    ]
    ID_MAP_PATH.write_text(
        json.dumps(id_map, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    return [doc.model_copy(update={"indexed": True}) for doc in docs_list]


def search_related_share_docs(
    *,
    schedule: Schedule,
    docs: Sequence[ShareDocDetail],
    limit: int = 3,
    min_score: float = RELATED_DOC_THRESHOLD,
) -> list[RelatedDoc]:
    if faiss is None or np is None:
        return []
    if not INDEX_PATH.exists() or not ID_MAP_PATH.exists():
        return []

    indexed_docs = {doc.id: doc for doc in docs if doc.indexed}
    if not indexed_docs:
        return []

    try:
        query_vector = _embed_texts(
            [_schedule_query_text(schedule)],
            task_type="RETRIEVAL_QUERY",
        )[0]
    except (AIServiceUnavailable, IndexError):
        return []

    index = faiss.read_index(str(INDEX_PATH))
    id_map = json.loads(ID_MAP_PATH.read_text(encoding="utf-8"))

    if not id_map:
        return []

    row_lookup = {
        int(entry["faiss_row"]): entry["doc_id"]
        for entry in id_map
        if "faiss_row" in entry and "doc_id" in entry
    }

    query = np.asarray([query_vector], dtype="float32")
    query = _normalize_vectors(query)

    candidate_count = min(
        max(limit * RERANK_CANDIDATE_MULTIPLIER, limit),
        len(id_map),
    )

    scores, indices = index.search(query, candidate_count)

    candidates: list[tuple[float, float, ShareDocDetail]] = []
    seen_doc_ids: set[str] = set()

    for score, row_index in zip(scores[0], indices[0]):
        if row_index < 0:
            continue

        doc_id = row_lookup.get(int(row_index))
        if doc_id is None or doc_id in seen_doc_ids:
            continue

        doc = indexed_docs.get(doc_id)
        if doc is None:
            continue

        seen_doc_ids.add(doc_id)

        base_score = max(0.0, min(float(score), 1.0))
        bonus = _rerank_bonus(schedule, doc)
        final_score = max(0.0, min(base_score + bonus, 1.0))

        if final_score < min_score:
            continue

        candidates.append((final_score, base_score, doc))

    candidates.sort(
        key=lambda item: (item[0], item[1], item[2].created_at),
        reverse=True,
    )

    return [
        RelatedDoc(
            doc_id=doc.id,
            title=doc.title,
            preview=doc.preview,
            relevance_score=round(final_score, 2),
            created_at=doc.created_at,
        )
        for final_score, _, doc in candidates[:limit]
    ]


def generate_ai_suggestion(
    *,
    schedule: Schedule,
    related_docs: Sequence[RelatedDoc],
    suggestion_id: str,
) -> Suggestion | None:
    if schedule.type != "meeting":
        return None

    if not related_docs:
        return None

    try:
        client = _build_client()
        model = _get_required_env("GEMINI_MODEL")
    except AIServiceUnavailable:
        return None

    docs_text = "\n".join(
        f"- {doc.title}: {doc.preview}"
        for doc in related_docs[:2]
    )

    prompt = f"""
You create one useful follow-up schedule suggestion in Korean.

Schedule:
- title: {schedule.title}
- date: {schedule.date}
- start_time: {schedule.start_time}
- end_time: {schedule.end_time}
- participants: {", ".join(schedule.participants) if schedule.participants else "none"}
- location: {schedule.location or "none"}

Related documents:
{docs_text}

Return only JSON matching this schema:
{{
  "type": "follow_up_meeting | review_session | task",
  "title": "string",
  "suggested_date": "YYYY-MM-DD",
  "suggested_start_time": "HH:MM or null",
  "reason": "string"
}}

Rules:
- Suggest only one follow-up item.
- The suggestion must be grounded in the related documents.
- If it is a meeting, use type="follow_up_meeting".
- If a clear time is not appropriate, use suggested_start_time=null.
- Keep the reason short and understandable for an end user.
""".strip()

    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SuggestionDraft,
                temperature=0.2,
            ),
        )
        draft = _coerce_parsed_response(response, SuggestionDraft)
    except Exception:
        return None

    return Suggestion(
        suggestion_id=suggestion_id,
        type=draft.type,
        title=draft.title,
        suggested_date=draft.suggested_date,
        suggested_start_time=draft.suggested_start_time,
        reason=draft.reason,
        based_on_schedule_id=schedule.id,
    )


def _rerank_bonus(schedule: Schedule, doc: ShareDocDetail) -> float:
    bonus = 0.0

    title_and_tags = _normalize_for_match(" ".join([doc.title, *doc.tags]))
    body_text = _normalize_for_match(f"{doc.preview} {doc.full_content}")

    participant_terms = [
        participant
        for participant in schedule.participants
        if participant.strip()
    ]

    if _contains_any(title_and_tags, participant_terms):
        bonus += PERSON_TITLE_TAG_BONUS
    elif _contains_any(body_text, participant_terms):
        bonus += PERSON_BODY_BONUS

    title_keywords = _title_keywords(schedule.title)
    if _contains_any(title_and_tags, title_keywords):
        bonus += TITLE_KEYWORD_TITLE_TAG_BONUS
    elif _contains_any(body_text, title_keywords):
        bonus += TITLE_KEYWORD_BODY_BONUS

    if _category_matches(schedule, doc):
        bonus += CATEGORY_MATCH_BONUS

    return min(bonus, MAX_RERANK_BONUS)


def _title_keywords(title: str) -> list[str]:
    tokens = re.findall(r"[가-힣A-Za-z0-9]+", title)
    keywords: list[str] = []

    for token in tokens:
        if len(token) < 2:
            continue
        if token in GENERIC_TITLE_WORDS:
            continue
        keywords.append(token)

    return keywords


def _category_matches(schedule: Schedule, doc: ShareDocDetail) -> bool:
    if schedule.type == "meeting" and doc.category == "meeting":
        return True
    if schedule.type == "deadline" and doc.category in {"project", "report"}:
        return True
    return False


def _contains_any(normalized_text: str, terms: Sequence[str]) -> bool:
    for term in terms:
        normalized_term = _normalize_for_match(term)
        if normalized_term and normalized_term in normalized_text:
            return True
    return False


def _normalize_for_match(value: str) -> str:
    normalized = value.lower()
    normalized = normalized.replace("님", "").replace("씨", "")
    normalized = re.sub(r"[\s\-_.,:;!?()\[\]{}'\"/\\|]+", "", normalized)
    return normalized


def _embed_texts(texts: Sequence[str], *, task_type: str) -> list[list[float]]:
    if not texts:
        return []

    client = _build_client()
    model = _get_required_env("GEMINI_EMBEDDING_MODEL")

    response = client.models.embed_content(
        model=model,
        contents=list(texts),
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIM,
        ),
    )

    embeddings = getattr(response, "embeddings", None) or []
    values: list[list[float]] = []

    for item in embeddings:
        extracted_values = _extract_embedding_values(item)
        if extracted_values:
            values.append([float(value) for value in extracted_values])

    return values


def _extract_embedding_values(item) -> list[float] | None:
    if item is None:
        return None

    direct_values = getattr(item, "values", None)
    if direct_values is not None:
        return list(direct_values)

    nested_embedding = getattr(item, "embedding", None)
    if nested_embedding is not None:
        nested_values = getattr(nested_embedding, "values", None)
        if nested_values is not None:
            return list(nested_values)

    if isinstance(item, dict):
        if item.get("values") is not None:
            return list(item["values"])
        if item.get("embedding") and item["embedding"].get("values") is not None:
            return list(item["embedding"]["values"])

    return None


def _normalize_vectors(vectors):
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1
    return vectors / norms


def _share_doc_embedding_text(doc: ShareDocDetail) -> str:
    return f"{doc.title}\n{doc.full_content}".strip()


def _schedule_query_text(schedule: Schedule) -> str:
    parts = [
        schedule.title,
        schedule.type,
        schedule.date,
        schedule.location or "",
        " ".join(schedule.participants),
    ]
    return " ".join(part for part in parts if part).strip()


def _build_client():
    if genai is None:
        raise AIServiceUnavailable("google-genai package is not installed")

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise AIServiceUnavailable("GEMINI_API_KEY is not configured")

    return genai.Client(api_key=api_key)


def _get_required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise AIServiceUnavailable(f"{name} is not configured")
    return value


def _coerce_parsed_response(response, schema_model: type[BaseModel]):
    parsed = getattr(response, "parsed", None)
    if parsed is not None:
        return parsed

    text = getattr(response, "text", None)
    if text:
        return schema_model.model_validate_json(text)

    raise AIServiceUnavailable("Gemini returned an empty response")


def _write_empty_index_files() -> None:
    FAISS_DIR.mkdir(parents=True, exist_ok=True)
    ID_MAP_PATH.write_text("[]", encoding="utf-8")

    if faiss is not None:
        index = faiss.IndexFlatIP(EMBEDDING_DIM)
        faiss.write_index(index, str(INDEX_PATH))
