from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Sequence

from schemas import Note, StoredSchedule

BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BASE_DIR / "DB"
FAISS_DIR = DB_DIR / "faiss_index"
NOTES_PATH = DB_DIR / "notes.json"
SCHEDULES_PATH = DB_DIR / "schedules.json"
ID_MAP_PATH = FAISS_DIR / "id_map.json"
INDEX_PATH = FAISS_DIR / "index.faiss"


def ensure_storage() -> None:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    FAISS_DIR.mkdir(parents=True, exist_ok=True)
    for path in (NOTES_PATH, SCHEDULES_PATH):
        if not path.exists():
            path.write_text("[]", encoding="utf-8")
    if not ID_MAP_PATH.exists():
        ID_MAP_PATH.write_text("[]", encoding="utf-8")


def _read_json_list(path: Path) -> list[dict]:
    ensure_storage()
    if not path.exists():
        return []
    raw_text = path.read_text(encoding="utf-8").strip()
    if not raw_text:
        return []
    data = json.loads(raw_text)
    if not isinstance(data, list):
        raise ValueError(f"{path.name} must contain a JSON array")
    return data


def _write_json(path: Path, payload: list[dict]) -> None:
    ensure_storage()
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_notes() -> list[Note]:
    return [Note.model_validate(item) for item in _read_json_list(NOTES_PATH)]


def save_notes(notes: Sequence[Note]) -> None:
    _write_json(NOTES_PATH, [note.model_dump(mode="json") for note in notes])


def load_schedules() -> list[StoredSchedule]:
    return [StoredSchedule.model_validate(item) for item in _read_json_list(SCHEDULES_PATH)]


def save_schedules(schedules: Sequence[StoredSchedule]) -> None:
    _write_json(SCHEDULES_PATH, [schedule.model_dump(mode="json") for schedule in schedules])


def list_notes_by_user(user_id: str) -> list[Note]:
    return [note for note in load_notes() if note.user_id == user_id]


def list_schedules_by_user(user_id: str) -> list[StoredSchedule]:
    return [schedule for schedule in load_schedules() if schedule.user_id == user_id]


def get_note_by_user(note_id: str, user_id: str) -> Note | None:
    return next(
        (note for note in load_notes() if note.id == note_id and note.user_id == user_id),
        None,
    )


def get_schedule_by_user(schedule_id: str, user_id: str) -> StoredSchedule | None:
    return next(
        (
            schedule
            for schedule in load_schedules()
            if schedule.id == schedule_id and schedule.user_id == user_id
        ),
        None,
    )


def delete_note_by_user(note_id: str, user_id: str) -> bool:
    notes = load_notes()
    filtered = [note for note in notes if not (note.id == note_id and note.user_id == user_id)]
    if len(filtered) == len(notes):
        return False
    save_notes(filtered)
    return True


def replace_schedule(updated_schedule: StoredSchedule) -> None:
    schedules = load_schedules()
    new_schedules: list[StoredSchedule] = []
    replaced = False
    for schedule in schedules:
        if schedule.id == updated_schedule.id and schedule.user_id == updated_schedule.user_id:
            new_schedules.append(updated_schedule)
            replaced = True
        else:
            new_schedules.append(schedule)
    if replaced:
        save_schedules(new_schedules)


def invalidate_rag_summary_cache(user_id: str) -> None:
    schedules = load_schedules()
    changed = False
    for schedule in schedules:
        if schedule.user_id == user_id and schedule.rag_summary is not None:
            schedule.rag_summary = None
            changed = True
    if changed:
        save_schedules(schedules)


def create_note_id(notes: Sequence[Note]) -> str:
    return _create_next_id("note", [note.id for note in notes])


def create_schedule_id(schedules: Sequence[StoredSchedule]) -> str:
    return _create_next_id("sch", [schedule.id for schedule in schedules])


def _create_next_id(prefix: str, values: Sequence[str]) -> str:
    pattern = re.compile(rf"^{re.escape(prefix)}_(\d+)$")
    max_value = 0
    for value in values:
        match = pattern.match(value)
        if match:
            max_value = max(max_value, int(match.group(1)))
    return f"{prefix}_{max_value + 1:03d}"
