from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Sequence

from schemas import DocCategory, Note, ShareDoc, ShareDocDetail, StoredSchedule

BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BASE_DIR / "DB"
FAISS_DIR = DB_DIR / "faiss_index"
SEED_DIR = DB_DIR / "seed"

NOTES_PATH = DB_DIR / "notes.json"
SCHEDULES_PATH = DB_DIR / "schedules.json"
SHARE_DOCS_PATH = DB_DIR / "share_docs.json"

SEED_NOTES_PATH = SEED_DIR / "notes.json"
SEED_SCHEDULES_PATH = SEED_DIR / "schedules.json"
SEED_SHARE_DOCS_PATH = SEED_DIR / "share_docs.json"

ID_MAP_PATH = FAISS_DIR / "id_map.json" # FAISS row와 실제 리소스 id 연결정보
INDEX_PATH = FAISS_DIR / "index.faiss" # 멕터 검색용 FAISS 인덱스 파일


def ensure_storage() -> None: # 스토리지 폴더와 파일이 없으면 생성
    DB_DIR.mkdir(parents=True, exist_ok=True)
    FAISS_DIR.mkdir(parents=True, exist_ok=True)

    for path in (NOTES_PATH, SCHEDULES_PATH, SHARE_DOCS_PATH):
        if not path.exists():
            path.write_text("[]", encoding="utf-8")

    if not ID_MAP_PATH.exists():
        ID_MAP_PATH.write_text("[]", encoding="utf-8")


def _read_json_list(path: Path) -> list[dict]: # json 파일 읽어서 python list로 반환
    ensure_storage()
    raw_text = path.read_text(encoding="utf-8").strip()
    if not raw_text:
        return []

    data = json.loads(raw_text)
    if not isinstance(data, list):
        raise ValueError(f"{path.name} must contain a JSON array")
    return data


def _write_json(path: Path, payload: list[dict]) -> None: # python list를 json 파일로 저장
    ensure_storage()
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_notes() -> list[Note]: # json list를 pydantic model 리스트로 변환
    return [Note.model_validate(item) for item in _read_json_list(NOTES_PATH)]


def save_notes(notes: Sequence[Note]) -> None: # pydantic model 리스트를 json list로 변환해서 저장
    _write_json(NOTES_PATH, [note.model_dump(mode="json") for note in notes])


def list_notes() -> list[Note]: # 최신순으로 정렬
    return sorted(load_notes(), key=lambda note: note.created_at, reverse=True)


def get_note(note_id: str) -> Note | None:
    return next((note for note in load_notes() if note.id == note_id), None)


def delete_note(note_id: str) -> bool:
    notes = load_notes()
    filtered = [note for note in notes if note.id != note_id]

    if len(filtered) == len(notes):
        return False

    save_notes(filtered)

    schedules = load_schedules()
    changed = False
    for schedule in schedules:
        if schedule.source_note_id == note_id:
            schedule.source_note_id = None
            changed = True

    if changed:
        save_schedules(schedules)

    return True


def load_schedules() -> list[StoredSchedule]:
    return [
        StoredSchedule.model_validate(item)
        for item in _read_json_list(SCHEDULES_PATH)
    ]


def save_schedules(schedules: Sequence[StoredSchedule]) -> None:
    _write_json(
        SCHEDULES_PATH,
        [schedule.model_dump(mode="json") for schedule in schedules],
    )


def list_schedules(
    *,
    from_date: str | None = None,
    to_date: str | None = None,
    event_type: str | None = None,
) -> list[StoredSchedule]:
    schedules = load_schedules()

    if from_date is not None:
        schedules = [schedule for schedule in schedules if schedule.date >= from_date]

    if to_date is not None:
        schedules = [schedule for schedule in schedules if schedule.date <= to_date]

    if event_type is not None:
        schedules = [schedule for schedule in schedules if schedule.type == event_type]

    return sorted(
        schedules,
        key=lambda schedule: (
            schedule.date,
            0 if schedule.is_all_day else 1,
            schedule.start_time or "",
        ),
    )


def get_schedule(schedule_id: str) -> StoredSchedule | None:
    return next(
        (schedule for schedule in load_schedules() if schedule.id == schedule_id),
        None,
    )


def replace_schedule(updated_schedule: StoredSchedule) -> None:
    schedules = load_schedules()
    replaced = False

    next_schedules: list[StoredSchedule] = []
    for schedule in schedules:
        if schedule.id == updated_schedule.id:
            next_schedules.append(updated_schedule)
            replaced = True
        else:
            next_schedules.append(schedule)

    if replaced:
        save_schedules(next_schedules)


def invalidate_rag_summary_cache() -> None:
    schedules = load_schedules()
    changed = False

    for schedule in schedules:
        if schedule.rag_summary is not None:
            schedule.rag_summary = None
            changed = True

    if changed:
        save_schedules(schedules)


def load_share_docs() -> list[ShareDocDetail]:
    return [
        ShareDocDetail.model_validate(item)
        for item in _read_json_list(SHARE_DOCS_PATH)
    ]


def save_share_docs(docs: Sequence[ShareDocDetail]) -> None:
    _write_json(SHARE_DOCS_PATH, [doc.model_dump(mode="json") for doc in docs])


def list_share_docs(
    *,
    q: str | None = None,
    category: DocCategory | None = None,
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[ShareDoc], int]:
    docs = load_share_docs()

    if q:
        lowered = q.lower()
        docs = [doc for doc in docs if lowered in doc.title.lower()]

    if category is not None:
        docs = [doc for doc in docs if doc.category == category]

    docs = sorted(docs, key=lambda doc: doc.created_at, reverse=True)
    total = len(docs)

    items = [
        ShareDoc(**doc.model_dump(exclude={"full_content"}))
        for doc in docs[offset : offset + limit]
    ]

    return items, total


def get_share_doc(doc_id: str) -> ShareDocDetail | None:
    return next((doc for doc in load_share_docs() if doc.id == doc_id), None)


def create_note_id(notes: Sequence[Note]) -> str:
    return _create_next_id("note", [note.id for note in notes])


def create_schedule_id(schedules: Sequence[StoredSchedule]) -> str:
    return _create_next_id("sch", [schedule.id for schedule in schedules])


def create_share_doc_id(docs: Sequence[ShareDocDetail]) -> str:
    return _create_next_id("doc", [doc.id for doc in docs])


def _create_next_id(prefix: str, values: Sequence[str]) -> str:
    pattern = re.compile(rf"^{re.escape(prefix)}_(\d+)$")
    max_value = 0

    for value in values:
        match = pattern.match(value)
        if match:
            max_value = max(max_value, int(match.group(1)))

    return f"{prefix}_{max_value + 1:03d}"


def reset_to_seed() -> dict[str, int]:
    ensure_storage()

    pairs = (
        (SEED_NOTES_PATH, NOTES_PATH, "notes"),
        (SEED_SCHEDULES_PATH, SCHEDULES_PATH, "schedules"),
        (SEED_SHARE_DOCS_PATH, SHARE_DOCS_PATH, "share_docs"),
    )

    counts: dict[str, int] = {}
    for seed_path, target_path, label in pairs:
        if seed_path.exists():
            payload = seed_path.read_text(encoding="utf-8")
        else:
            payload = "[]"

        target_path.write_text(payload, encoding="utf-8")
        counts[label] = len(json.loads(payload) or [])

    if INDEX_PATH.exists():
        INDEX_PATH.unlink()
    ID_MAP_PATH.write_text("[]", encoding="utf-8")

    from services.ai_service import rebuild_share_doc_index

    docs = load_share_docs()
    if docs:
        updated = rebuild_share_doc_index(docs)
        save_share_docs(updated)

    return counts
