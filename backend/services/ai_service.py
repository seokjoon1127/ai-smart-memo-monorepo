from __future__ import annotations

import json
import math
import os
from datetime import datetime
from pathlib import Path
from typing import Sequence
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from pydantic import BaseModel, Field

from schemas import Note, RagSummary, RelatedNote, Schedule
from services.db_handler import FAISS_DIR, ID_MAP_PATH, INDEX_PATH

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

KST = ZoneInfo("Asia/Seoul")
EMBEDDING_DIM = 768

try:
    import numpy as np
except ImportError:  # pragma: no cover - dependency installed at runtime
    np = None

try:
    import faiss
except ImportError:  # pragma: no cover - dependency installed at runtime
    faiss = None

try:
    from google import genai
    from google.genai import types
except ImportError:  # pragma: no cover - dependency installed at runtime
    genai = None
    types = None


class AIServiceUnavailable(RuntimeError):
    """Raised when Gemini services are not configured or unavailable."""


class ExtractedEvent(BaseModel):
    title: str
    date: str
    time: str | None = None
    duration_min: int | None = None
    type: str
    participants: list[str] = Field(default_factory=list)


class ExtractedEventEnvelope(BaseModel):
    events: list[ExtractedEvent] = Field(default_factory=list)


class RagSummaryEnvelope(BaseModel):
    summary: str


def parse_note_content(content: str) -> list[ExtractedEvent]:
    client = _build_client()
    model = _get_required_env("GEMINI_MODEL")
    today = datetime.now(KST).date().isoformat()

    prompt = f"""
You extract schedule candidates from a Korean memo.
Today is {today}.

Rules:
- Return only JSON matching the schema.
- If there is no schedule information, return events as an empty array.
- Use date format YYYY-MM-DD.
- Use time format HH:mm or null.
- Event type must be one of: meeting, deadline, event, other.
- If the memo clearly describes a deadline without a time, set time=null and duration_min=null.
- Default duration rules:
  - meeting: 60
  - meal: 90
  - other timed event: 30
- If a participant name is explicitly mentioned, include it.

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


def rebuild_note_index(notes: Sequence[Note]) -> None:
    FAISS_DIR.mkdir(parents=True, exist_ok=True)

    if not notes:
        _write_empty_index_files()
        return

    if faiss is None or np is None:
        _write_empty_index_files()
        return

    try:
        embeddings = _embed_texts(
            [note.content for note in notes],
            task_type="RETRIEVAL_DOCUMENT",
        )
    except AIServiceUnavailable:
        _write_empty_index_files()
        return

    if not embeddings:
        _write_empty_index_files()
        return

    vectors = np.asarray(embeddings, dtype="float32")
    if vectors.ndim != 2 or vectors.shape[1] != EMBEDDING_DIM:
        raise ValueError("Unexpected embedding dimension")

    index = faiss.IndexFlatL2(EMBEDDING_DIM)
    index.add(vectors)
    faiss.write_index(index, str(INDEX_PATH))

    id_map = [
        {
            "faiss_row": row,
            "note_id": note.id,
            "user_id": note.user_id,
        }
        for row, note in enumerate(notes)
    ]
    ID_MAP_PATH.write_text(
        json.dumps(id_map, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def search_related_notes(
    *,
    schedule: Schedule,
    source_note: Note | None,
    notes: Sequence[Note],
    user_id: str,
) -> list[RelatedNote]:
    candidate_notes = [note for note in notes if note.user_id == user_id]
    if not candidate_notes:
        return []

    if faiss is None or np is None or not INDEX_PATH.exists() or not ID_MAP_PATH.exists():
        return []

    try:
        query_vector = _embed_texts([_rag_query(schedule, source_note)], task_type="RETRIEVAL_QUERY")[0]
    except (AIServiceUnavailable, IndexError):
        return []

    index = faiss.read_index(str(INDEX_PATH))
    query = np.asarray([query_vector], dtype="float32")
    distances, indices = index.search(query, min(10, len(candidate_notes)))
    id_map = json.loads(ID_MAP_PATH.read_text(encoding="utf-8"))
    id_lookup = {entry["faiss_row"]: entry for entry in id_map}
    note_lookup = {note.id: note for note in candidate_notes}

    results: list[RelatedNote] = []
    seen_note_ids: set[str] = set()
    for distance, row_index in zip(distances[0], indices[0]):
        if row_index < 0:
            continue
        entry = id_lookup.get(int(row_index))
        if entry is None or entry.get("user_id") != user_id:
            continue
        note_id = entry["note_id"]
        if source_note is not None and note_id == source_note.id:
            continue
        if note_id in seen_note_ids:
            continue
        note = note_lookup.get(note_id)
        if note is None:
            continue
        seen_note_ids.add(note_id)
        relevance_score = round(1 / (1 + max(float(distance), 0.0)), 4)
        results.append(
            RelatedNote(
                note_id=note.id,
                content=note.content,
                relevance_score=relevance_score,
                created_at=note.created_at,
            )
        )
        if len(results) >= 3:
            break

    return results


def generate_rag_summary(schedule: Schedule, related_notes: Sequence[RelatedNote]) -> RagSummary | None:
    if not related_notes:
        return None

    client = _build_client()
    model = _get_required_env("GEMINI_MODEL")
    notes_text = "\n\n".join(
        f"[{note.note_id}] {note.content}"
        for note in related_notes
    )
    prompt = f"""
Summarize the related notes for the schedule below in Korean.
Keep it concise and useful for an end user.

Schedule:
- title: {schedule.title}
- date: {schedule.date}
- time: {schedule.time}
- type: {schedule.type}

Related notes:
{notes_text}
""".strip()

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=RagSummaryEnvelope,
            temperature=0.2,
        ),
    )
    parsed = _coerce_parsed_response(response, RagSummaryEnvelope)
    return RagSummary(
        summary=parsed.summary,
        source_note_ids=[note.note_id for note in related_notes],
        generated_at=datetime.now(KST).isoformat(timespec="seconds"),
    )


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
        if "values" in item and item["values"] is not None:
            return list(item["values"])
        if "embedding" in item and item["embedding"] and item["embedding"].get("values") is not None:
            return list(item["embedding"]["values"])

    return None


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


def _rag_query(schedule: Schedule, source_note: Note | None) -> str:
    if source_note is not None and source_note.content.strip():
        return source_note.content
    return f"{schedule.title} {schedule.type} {schedule.date}"


def _write_empty_index_files() -> None:
    FAISS_DIR.mkdir(parents=True, exist_ok=True)
    ID_MAP_PATH.write_text("[]", encoding="utf-8")
    if faiss is not None:
        index = faiss.IndexFlatL2(EMBEDDING_DIM)
        faiss.write_index(index, str(INDEX_PATH))
