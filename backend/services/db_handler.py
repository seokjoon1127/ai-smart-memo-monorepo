from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Sequence

from schemas import DocCategory, GoogleToken, Note, ShareDoc, ShareDocDetail, StoredSchedule, User


BASE_DIR = Path(__file__).resolve().parent.parent
DB_DIR = BASE_DIR / "DB"
FAISS_DIR = DB_DIR / "faiss_index"
SEED_DIR = DB_DIR / "seed"

NOTES_PATH = DB_DIR / "notes.json"
SCHEDULES_PATH = DB_DIR / "schedules.json"
SHARE_DOCS_PATH = DB_DIR / "share_docs.json"
USERS_PATH = DB_DIR / "users.json"
GOOGLE_TOKENS_PATH = DB_DIR / "google_tokens.json"
GOOGLE_USER_ID_HASH_LENGTH = 32

SEED_NOTES_PATH = SEED_DIR / "notes.json"
SEED_SCHEDULES_PATH = SEED_DIR / "schedules.json"
SEED_SHARE_DOCS_PATH = SEED_DIR / "share_docs.json"

ID_MAP_PATH = FAISS_DIR / "id_map.json" # FAISS row와 실제 리소스 id 연결정보
INDEX_PATH = FAISS_DIR / "index.faiss" # 멕터 검색용 FAISS 인덱스 파일


def ensure_storage() -> None: # 스토리지 폴더와 파일이 없으면 생성
    DB_DIR.mkdir(parents=True, exist_ok=True)
    FAISS_DIR.mkdir(parents=True, exist_ok=True)

    for path in (
        NOTES_PATH,
        SCHEDULES_PATH,
        SHARE_DOCS_PATH,
        USERS_PATH,
        GOOGLE_TOKENS_PATH,
    ):
        if not path.exists():
            path.write_text("[]", encoding="utf-8")

    if not ID_MAP_PATH.exists():
        ID_MAP_PATH.write_text("[]", encoding="utf-8")

    _restore_seed_file_if_empty(NOTES_PATH, SEED_NOTES_PATH)
    _restore_seed_file_if_empty(SCHEDULES_PATH, SEED_SCHEDULES_PATH)
    _restore_seed_file_if_empty(SHARE_DOCS_PATH, SEED_SHARE_DOCS_PATH)


def _restore_seed_file_if_empty(target_path: Path, seed_path: Path) -> None:
    if not seed_path.exists():
        return

    raw_text = target_path.read_text(encoding="utf-8").strip()
    if raw_text and raw_text != "[]":
        return

    seed_text = seed_path.read_text(encoding="utf-8")
    if seed_text.strip():
        target_path.write_text(seed_text, encoding="utf-8")


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

def load_users() -> list[User]:
    return [User.model_validate(item) for item in _read_json_list(USERS_PATH)]

def save_users(users: Sequence[User]) -> None:
    _write_json(USERS_PATH, [user.model_dump(mode="json") for user in users])

def load_google_tokens() -> list[GoogleToken]:
    return [GoogleToken.model_validate(item) for item in _read_json_list(GOOGLE_TOKENS_PATH)]

def save_google_tokens(google_tokens: Sequence[GoogleToken]) -> None:
    _write_json(GOOGLE_TOKENS_PATH, [google_token.model_dump(mode="json") for google_token in google_tokens])

def list_notes(owner_user_id: str | None = None) -> list[Note]: # 최신순으로 정렬
    notes = [
        note
        for note in load_notes()
        if _is_visible_owner(note.owner_user_id, owner_user_id)
    ]
    return sorted(notes, key=lambda note: note.created_at, reverse=True)


def get_note(note_id: str, owner_user_id: str | None = None) -> Note | None:
    return next(
        (
            note
            for note in load_notes()
            if note.id == note_id
            and _is_visible_owner(note.owner_user_id, owner_user_id)
        ),
        None,
    )


def delete_note(note_id: str, owner_user_id: str) -> bool:
    notes = load_notes()
    filtered = [
        note
        for note in notes
        if not (
            note.id == note_id
            and note.owner_user_id is not None
            and note.owner_user_id == owner_user_id
        )
    ]

    if len(filtered) == len(notes):
        return False

    save_notes(filtered)

    schedules = load_schedules()
    changed = False
    for schedule in schedules:
        if (
            schedule.source_note_id == note_id
            and schedule.owner_user_id == owner_user_id
        ):
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
        [
            schedule.model_dump(mode="json", exclude={"can_delete"})
            for schedule in schedules
        ],
    )


def list_schedules(
    *,
    from_date: str | None = None,
    to_date: str | None = None,
    event_type: str | None = None,
    owner_user_id: str | None = None,
) -> list[StoredSchedule]:
    schedules = load_schedules()
    schedules = [
        schedule
        for schedule in schedules
        if _is_visible_owner(schedule.owner_user_id, owner_user_id)
    ]

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


def get_visible_schedule(
    schedule_id: str,
    owner_user_id: str | None,
) -> StoredSchedule | None:
    schedule = get_schedule(schedule_id)
    if schedule is None:
        return None

    if not _is_visible_owner(schedule.owner_user_id, owner_user_id):
        return None

    return schedule


def delete_schedule(schedule_id: str, owner_user_id: str) -> bool:
    schedules = load_schedules()
    next_schedules = [
        schedule
        for schedule in schedules
        if not (
            schedule.id == schedule_id
            and schedule.owner_user_id is not None
            and schedule.owner_user_id == owner_user_id
        )
    ]

    if len(next_schedules) == len(schedules):
        return False

    save_schedules(next_schedules)
    return True


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


def _is_visible_owner(
    resource_owner_user_id: str | None,
    viewer_user_id: str | None,
) -> bool:
    return resource_owner_user_id is None or resource_owner_user_id == viewer_user_id


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

def create_user_id(users: Sequence[User]) -> str:
    return _create_next_id("user", [user.id for user in users])

def create_google_user_id(google_sub: str) -> str:
    digest = hashlib.sha256(google_sub.encode("utf-8")).hexdigest()
    return f"user_{digest[:GOOGLE_USER_ID_HASH_LENGTH]}"

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

    counts: dict[str, int] = {}

    seed_notes = _read_seed_models(SEED_NOTES_PATH, Note)
    personal_notes = [
        note
        for note in load_notes()
        if _is_persistent_personal_owner(note.owner_user_id)
    ]
    save_notes([*seed_notes, *personal_notes])
    counts["notes"] = len(seed_notes) + len(personal_notes)

    seed_schedules = _read_seed_models(SEED_SCHEDULES_PATH, StoredSchedule)
    personal_schedules = [
        schedule
        for schedule in load_schedules()
        if _is_persistent_personal_owner(schedule.owner_user_id)
    ]
    save_schedules([*seed_schedules, *personal_schedules])
    counts["schedules"] = len(seed_schedules) + len(personal_schedules)

    if SEED_SHARE_DOCS_PATH.exists():
        payload = SEED_SHARE_DOCS_PATH.read_text(encoding="utf-8")
    else:
        payload = "[]"
    SHARE_DOCS_PATH.write_text(payload, encoding="utf-8")
    counts["share_docs"] = len(json.loads(payload) or [])

    if INDEX_PATH.exists():
        INDEX_PATH.unlink()
    ID_MAP_PATH.write_text("[]", encoding="utf-8")

    from services.ai_service import rebuild_share_doc_index

    docs = load_share_docs()
    if docs:
        updated = rebuild_share_doc_index(docs)
        save_share_docs(updated)

    return counts


def _read_seed_models(path: Path, model: type[Note] | type[StoredSchedule]):
    if not path.exists():
        return []

    raw_text = path.read_text(encoding="utf-8").strip()
    if not raw_text:
        return []

    data = json.loads(raw_text)
    if not isinstance(data, list):
        raise ValueError(f"{path.name} must contain a JSON array")

    return [model.model_validate(item) for item in data]


def _is_persistent_personal_owner(owner_user_id: str | None) -> bool:
    return owner_user_id is not None and not owner_user_id.startswith("guest_")

def get_user_by_google_sub(google_sub: str) -> User | None:
    return next(
        (user for user in load_users() if user.google_sub == google_sub),
        None,
    )

def get_google_token_by_user_id(user_id: str) -> GoogleToken | None:
    return next(
        (token for token in load_google_tokens() if token.user_id == user_id),
        None,
    )

def upsert_google_token(token: GoogleToken) -> None:
    tokens = load_google_tokens()
    updated = False

    next_tokens: list[GoogleToken] = []
    for existing_token in tokens:
        if existing_token.user_id == token.user_id:
            next_tokens.append(token)
            updated = True
        else:
            next_tokens.append(existing_token)
    if not updated:
        next_tokens.append(token)

    save_google_tokens(next_tokens)

def migrate_google_token_user_id(old_user_id: str, new_user_id: str) -> None:
    if old_user_id == new_user_id:
        return

    tokens = load_google_tokens()
    changed = False
    migrated_token: GoogleToken | None = None
    next_tokens: list[GoogleToken] = []

    for token in tokens:
        if token.user_id == old_user_id:
            migrated_token = GoogleToken(
                **token.model_dump(exclude={"user_id"}),
                user_id=new_user_id,
            )
            changed = True
        else:
            next_tokens.append(token)

    if migrated_token is not None:
        next_tokens = [
            token for token in next_tokens if token.user_id != new_user_id
        ]
        next_tokens.append(migrated_token)

    if changed:
        save_google_tokens(next_tokens)

def get_or_create_user(
    *,
    google_sub: str,
    email: str,
    name: str | None,
    created_at: str,
) -> User:
    users = load_users()
    stable_user_id = create_google_user_id(google_sub)

    for index, existing_user in enumerate(users):
        if existing_user.google_sub != google_sub:
            continue

        if existing_user.id == stable_user_id:
            return existing_user

        updated_user = User(
            **existing_user.model_dump(exclude={"id"}),
            id=stable_user_id,
        )
        users[index] = updated_user
        save_users(users)
        migrate_google_token_user_id(existing_user.id, stable_user_id)
        return updated_user

    user = User(
        id=stable_user_id,
        google_sub=google_sub,
        email=email,
        name=name,
        onboarding_completed=False,
        created_at=created_at,
    )

    users.append(user)
    save_users(users)

    return user

def mark_onboarding_completed(user_id: str) -> User | None:
    users = load_users()
    updated_user = None

    next_users: list[User] = []
    for user in users:
        if user.id == user_id:
            updated_user = User(
                **user.model_dump(),
                onboarding_completed=True,
            )
            next_users.append(updated_user)
        else:
            next_users.append(user)

    if updated_user is None:
        return None

    save_users(next_users)
    return updated_user

def get_user_by_id(user_id: str) -> User | None:
    return next(
        (user for user in load_users() if user.id == user_id),
        None,
    )
