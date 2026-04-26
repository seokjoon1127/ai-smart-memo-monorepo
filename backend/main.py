from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Any
from uuid import uuid4
from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Query, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from schemas import (
    AcceptSuggestionRequest,
    ApiErrorCode,
    ConflictInfo,
    CreateNoteRequest,
    CreateSchedulesRequest,
    CreateSchedulesResponse,
    CreateShareDocRequest,
    DocCategory,
    EventType,
    GetShareBoxResponse,
    Note,
    ParseRequest,
    ParseResponse,
    ParsedEvent,
    Schedule,
    ScheduleDetail,
    ScheduleFailure,
    ShareDoc,
    ShareDocDetail,
    StoredSchedule,
    Suggestion,
)
from services.ai_service import (
    AIServiceUnavailable,
    generate_ai_suggestion,
    parse_note_content,
    rebuild_share_doc_index,
    search_related_share_docs,
)
from services.calendar import check_conflicts
from services.db_handler import (
    create_note_id,
    create_schedule_id,
    create_share_doc_id,
    delete_note,
    get_note,
    get_schedule,
    get_share_doc,
    list_notes,
    list_schedules,
    list_share_docs,
    load_notes,
    load_schedules,
    load_share_docs,
    save_notes,
    save_schedules,
    save_share_docs,
)

load_dotenv()

KST = ZoneInfo("Asia/Seoul")
SUGGESTION_TTL = timedelta(hours=24)

app = FastAPI(title="AI Smart Memo Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SuggestionCacheValue = tuple[Suggestion, datetime]
SUGGESTION_CACHE: dict[str, SuggestionCacheValue] = {}
SUGGESTION_SEQUENCE = 0


class ApiException(Exception):
    def __init__(
        self,
        status_code: int,
        code: ApiErrorCode,
        message: str,
        detail: dict[str, Any] | None = None,
    ) -> None:
        self.status_code = status_code
        self.code = code
        self.message = message
        self.detail = detail


@app.exception_handler(ApiException)
async def api_exception_handler(_: Request, exc: ApiException) -> JSONResponse:
    return _error_response(
        status_code=exc.status_code,
        code=exc.code,
        message=exc.message,
        detail=exc.detail,
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return _error_response(
        status_code=status.HTTP_400_BAD_REQUEST,
        code="INVALID_REQUEST",
        message="Invalid request",
        detail={"errors": jsonable_encoder(exc.errors())},
    )


@app.exception_handler(Exception)
async def unexpected_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return _error_response(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        code="INTERNAL_ERROR",
        message="Internal server error",
        detail={"type": exc.__class__.__name__},
    )


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"ok": "true"}


@app.get("/api")
def api_root() -> dict[str, str]:
    return {"name": "AI Smart Memo API", "version": "1.0.0"}


@app.get("/api/notes", response_model=list[Note])
def get_notes() -> list[Note]:
    return list_notes()


@app.post("/api/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
def create_note(payload: CreateNoteRequest) -> Note:
    notes = load_notes()

    note = Note(
        id=create_note_id(notes),
        content=payload.content.strip(),
        created_at=_now_iso(),
        indexed=True,
    )

    notes.append(note)
    save_notes(notes)

    return note


@app.delete("/api/notes/{note_id}")
def remove_note(note_id: str) -> dict[str, bool]:
    deleted = delete_note(note_id)

    if not deleted:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Note not found",
            detail={"note_id": note_id},
        )

    return {"ok": True}


@app.post("/api/parse", response_model=ParseResponse)
def parse_note(payload: ParseRequest) -> ParseResponse:
    note = get_note(payload.note_id)

    if note is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Note not found",
            detail={"note_id": payload.note_id},
        )

    try:
        extracted_events = parse_note_content(note.content)
    except AIServiceUnavailable as exc:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="EXTERNAL_SERVICE_UNAVAILABLE",
            message=str(exc),
        ) from exc
    except Exception as exc:
        raise ApiException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="LLM_PARSE_FAILED",
            message="Failed to parse memo",
        ) from exc

    schedules = load_schedules()
    parsed_events: list[ParsedEvent] = []

    for index, event in enumerate(extracted_events, start=1):
        try:
            conflict = check_conflicts(
                date=event.date,
                start_time=event.start_time,
                end_time=event.end_time,
                schedules=schedules,
                assume_default_duration=True,
            )
        except ValueError as exc:
            raise ApiException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                code="LLM_PARSE_FAILED",
                message=str(exc),
            ) from exc

        parsed_events.append(
            ParsedEvent(
                temp_id=f"evt_tmp_{index}",
                title=event.title,
                date=event.date,
                is_all_day=event.is_all_day,
                start_time=event.start_time,
                end_time=event.end_time,
                type=event.type,
                participants=event.participants,
                location=event.location,
                conflict=conflict,
            )
        )

    return ParseResponse(note_id=note.id, events=parsed_events)


@app.post(
    "/api/schedules",
    response_model=CreateSchedulesResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_schedules(payload: CreateSchedulesRequest) -> CreateSchedulesResponse:
    schedules = load_schedules()
    created: list[Schedule] = []
    failed: list[ScheduleFailure] = []

    for event in payload.events:
        _validate_schedule_event(event_date=event.date, start_time=event.start_time, end_time=event.end_time, is_all_day=event.is_all_day)

        schedule_id = create_schedule_id(schedules)
        google_event_id, failure_reason = _sync_google_calendar_mock()

        stored = StoredSchedule(
            id=schedule_id,
            title=event.title,
            date=event.date,
            is_all_day=event.is_all_day,
            start_time=event.start_time,
            end_time=event.end_time,
            type=event.type,
            participants=event.participants,
            location=event.location,
            alert_minutes_before=event.alert_minutes_before,
            google_event_id=google_event_id,
            source_note_id=event.source_note_id,
            created_at=_now_iso(),
            rag_summary=None,
        )

        schedules.append(stored)
        created.append(stored.to_public_schedule())

        if failure_reason is not None:
            failed.append(
                ScheduleFailure(
                    schedule_id=schedule_id,
                    reason=failure_reason,
                )
            )

    save_schedules(schedules)

    return CreateSchedulesResponse(schedules=created, failed=failed)


@app.get("/api/schedules", response_model=list[Schedule])
def get_schedules(
    from_date: str = Query(..., alias="from"),
    to_date: str = Query(..., alias="to"),
    event_type: EventType | None = Query(default=None, alias="type"),
) -> list[Schedule]:
    _validate_date(from_date, "from")
    _validate_date(to_date, "to")

    if from_date > to_date:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_REQUEST",
            message="from must be before or equal to to",
            detail={"from": from_date, "to": to_date},
        )

    schedules = list_schedules(
        from_date=from_date,
        to_date=to_date,
        event_type=event_type,
    )

    return [schedule.to_public_schedule() for schedule in schedules]


@app.get("/api/schedules/{schedule_id}", response_model=ScheduleDetail)
def get_schedule_detail(schedule_id: str) -> ScheduleDetail:
    stored = get_schedule(schedule_id)

    if stored is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Schedule not found",
            detail={"schedule_id": schedule_id},
        )

    schedule = stored.to_public_schedule()
    docs = load_share_docs()

    related_docs = search_related_share_docs(schedule=schedule, docs=docs)

    ai_suggestion = None
    if schedule.type == "meeting":
        suggestion_id = _create_suggestion_id()
        ai_suggestion = generate_ai_suggestion(
            schedule=schedule,
            related_docs=related_docs,
            suggestion_id=suggestion_id,
        )
        if ai_suggestion is not None:
            _save_suggestion(ai_suggestion)

    return ScheduleDetail(
        **schedule.model_dump(),
        related_docs=related_docs,
        ai_suggestion=ai_suggestion,
    )


@app.get("/api/calendar/conflicts", response_model=ConflictInfo)
def get_calendar_conflicts(
    date: str = Query(...),
    start_time: str | None = Query(default=None),
    end_time: str | None = Query(default=None),
) -> ConflictInfo:
    _validate_date(date, "date")
    _validate_optional_time(start_time, "start_time")
    _validate_optional_time(end_time, "end_time")

    try:
        return check_conflicts(
            date=date,
            start_time=start_time,
            end_time=end_time,
            schedules=load_schedules(),
            assume_default_duration=False,
        )
    except ValueError as exc:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_REQUEST",
            message=str(exc),
        ) from exc


@app.get("/api/sharebox", response_model=GetShareBoxResponse)
def get_sharebox(
    q: str | None = Query(default=None),
    category: DocCategory | None = Query(default=None),
    limit: int = Query(default=20, ge=0),
    offset: int = Query(default=0, ge=0),
) -> GetShareBoxResponse:
    items, total = list_share_docs(
        q=q,
        category=category,
        limit=limit,
        offset=offset,
    )

    return GetShareBoxResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@app.post("/api/sharebox", response_model=ShareDoc, status_code=status.HTTP_201_CREATED)
def create_share_doc(
    payload: CreateShareDocRequest,
    background_tasks: BackgroundTasks,
) -> ShareDoc:
    docs = load_share_docs()

    doc = ShareDocDetail(
        id=create_share_doc_id(docs),
        title=payload.title.strip(),
        category=payload.category,
        author=payload.author.strip(),
        preview=_make_preview(payload.full_content),
        tags=payload.tags,
        created_at=_now_iso(),
        indexed=False,
        full_content=payload.full_content,
    )

    docs.append(doc)
    save_share_docs(docs)

    background_tasks.add_task(_rebuild_share_doc_index_task)

    return ShareDoc(**doc.model_dump(exclude={"full_content"}))


@app.get("/api/sharebox/{doc_id}", response_model=ShareDocDetail)
def get_share_doc_detail(doc_id: str) -> ShareDocDetail:
    doc = get_share_doc(doc_id)

    if doc is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="ShareDoc not found",
            detail={"doc_id": doc_id},
        )

    return doc


@app.post("/api/suggestions/{suggestion_id}/accept", response_model=Schedule)
def accept_suggestion(
    suggestion_id: str,
    payload: AcceptSuggestionRequest,
) -> Schedule:
    suggestion = _pop_suggestion(suggestion_id)

    if suggestion is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Suggestion not found or expired",
            detail={"suggestion_id": suggestion_id},
        )

    schedules = load_schedules()
    schedule_id = create_schedule_id(schedules)
    google_event_id, _ = _sync_google_calendar_mock()

    stored = StoredSchedule(
        id=schedule_id,
        title=suggestion.title,
        date=suggestion.suggested_date,
        is_all_day=suggestion.suggested_start_time is None,
        start_time=suggestion.suggested_start_time,
        end_time=None,
        type=_suggestion_type_to_event_type(suggestion.type),
        participants=[],
        location=None,
        alert_minutes_before=payload.alert_minutes_before,
        google_event_id=google_event_id,
        source_note_id=None,
        created_at=_now_iso(),
        rag_summary=None,
    )

    schedules.append(stored)
    save_schedules(schedules)

    return stored.to_public_schedule()


def _now_iso() -> str:
    return datetime.now(KST).isoformat(timespec="seconds")


def _error_response(
    *,
    status_code: int,
    code: ApiErrorCode,
    message: str,
    detail: dict[str, Any] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }

    if detail is not None:
        body["error"]["detail"] = detail

    return JSONResponse(status_code=status_code, content=body)


def _validate_schedule_event(
    *,
    event_date: str,
    start_time: str | None,
    end_time: str | None,
    is_all_day: bool,
) -> None:
    _validate_date(event_date, "date")
    _validate_optional_time(start_time, "start_time")
    _validate_optional_time(end_time, "end_time")

    if is_all_day:
        if start_time is not None or end_time is not None:
            raise ApiException(
                status_code=status.HTTP_400_BAD_REQUEST,
                code="INVALID_REQUEST",
                message="all-day schedules must not have start_time or end_time",
            )
        return

    if start_time is None:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_REQUEST",
            message="start_time is required for timed schedules",
        )

    if end_time is not None and end_time <= start_time:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_REQUEST",
            message="end_time must be after start_time",
        )


def _validate_date(value: str, field_name: str) -> None:
    try:
        datetime.strptime(value, "%Y-%m-%d")
    except ValueError as exc:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_REQUEST",
            message=f"{field_name} must be YYYY-MM-DD",
            detail={field_name: value},
        ) from exc


def _validate_optional_time(value: str | None, field_name: str) -> None:
    if value is None:
        return

    try:
        datetime.strptime(value, "%H:%M")
    except ValueError as exc:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_REQUEST",
            message=f"{field_name} must be HH:MM",
            detail={field_name: value},
        ) from exc


def _make_preview(full_content: str) -> str:
    normalized = full_content.strip()
    if len(normalized) <= 200:
        return normalized
    return f"{normalized[:200]}..."


def _sync_google_calendar_mock() -> tuple[str | None, str | None]:
    gcal_enabled = os.getenv("GCAL_ENABLED", "false").lower() == "true"

    if not gcal_enabled:
        return f"mock_{uuid4().hex[:8]}", None

    return None, "Google Calendar integration is not configured"


def _rebuild_share_doc_index_task() -> None:
    docs = load_share_docs()
    updated_docs = rebuild_share_doc_index(docs)
    save_share_docs(updated_docs)


def _create_suggestion_id() -> str:
    global SUGGESTION_SEQUENCE

    SUGGESTION_SEQUENCE += 1
    return f"sug_{SUGGESTION_SEQUENCE:03d}"


def _save_suggestion(suggestion: Suggestion) -> None:
    expires_at = datetime.now(KST) + SUGGESTION_TTL
    SUGGESTION_CACHE[suggestion.suggestion_id] = (suggestion, expires_at)


def _pop_suggestion(suggestion_id: str) -> Suggestion | None:
    _cleanup_expired_suggestions()

    cached = SUGGESTION_CACHE.pop(suggestion_id, None)
    if cached is None:
        return None

    suggestion, expires_at = cached
    if expires_at < datetime.now(KST):
        return None

    return suggestion


def _cleanup_expired_suggestions() -> None:
    now = datetime.now(KST)
    expired_ids = [
        suggestion_id
        for suggestion_id, (_, expires_at) in SUGGESTION_CACHE.items()
        if expires_at < now
    ]

    for suggestion_id in expired_ids:
        SUGGESTION_CACHE.pop(suggestion_id, None)


def _suggestion_type_to_event_type(suggestion_type: str) -> EventType:
    if suggestion_type in {"follow_up_meeting", "review_session"}:
        return "meeting"
    return "other"
