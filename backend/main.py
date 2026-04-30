from __future__ import annotations

import logging
import os
import sys
import traceback
import requests
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo
from starlette.middleware.sessions import SessionMiddleware


logging.basicConfig(level=logging.INFO, stream=sys.stderr, force=True)
logger = logging.getLogger("ai_smart_memo")
logger.setLevel(logging.DEBUG)

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Query, Request, Response, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token


from schemas import (
    AcceptSuggestionRequest,
    ApiErrorCode,
    ConflictInfo,
    CreateNoteRequest,
    CreateSchedulesRequest,
    CreateSchedulesResponse,
    CreateGoogleCalendarEventRequest,
    CreateShareDocRequest,
    DocCategory,
    EventType,
    GetShareBoxResponse,
    GoogleCalendarEventResponse,
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
    AuthResponse,
    AuthUser,
    GoogleAuthCodeRequest,
    GoogleToken,
    User,
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
    reset_to_seed,
    replace_schedule,
    save_notes,
    save_schedules,
    save_share_docs,
    get_user_by_id,
    get_or_create_user,
    upsert_google_token,
    get_google_token_by_user_id,
)
load_dotenv()

KST = ZoneInfo("Asia/Seoul")
SUGGESTION_TTL = timedelta(hours=24)
GOOGLE_CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events"
GOOGLE_CALENDAR_WRITE_SCOPES = {
    GOOGLE_CALENDAR_SCOPE,
    "https://www.googleapis.com/auth/calendar",
}
GOOGLE_CALENDAR_EVENTS_URL = (
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
)
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"
TOKEN_REFRESH_GRACE_SECONDS = 60

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-session-secret")
IS_PRODUCTION = os.getenv("ENV", "development") == "production"
SESSION_VERSION = 2
SESSION_COOKIE_NAME = "__session"
LEGACY_SESSION_COOKIE_NAME = "session"
SESSION_COOKIE_SAMESITE = "none" if IS_PRODUCTION else "lax"
SESSION_COOKIE_SECURE = IS_PRODUCTION

app = FastAPI(title="AI Smart Memo Backend", version="1.0.0")

app.add_middleware(
    SessionMiddleware,
    secret_key=SESSION_SECRET,
    session_cookie=SESSION_COOKIE_NAME,
    same_site=SESSION_COOKIE_SAMESITE,
    https_only=SESSION_COOKIE_SECURE,
)


_default_origins = "http://localhost:5173"
_allowed_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
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
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    logger.warning(
        "RequestValidationError on %s %s: %s",
        request.method,
        request.url.path,
        exc.errors(),
    )
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
        logger.error(
            "parse_note failed: %s: %s\n%s",
            exc.__class__.__name__,
            exc,
            traceback.format_exc(),
        )
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
            google_event_id=None,
            source_note_id=event.source_note_id,
            created_at=_now_iso(),
            rag_summary=None,
        )

        schedules.append(stored)
        created.append(stored.to_public_schedule())

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


@app.post("/api/admin/reset")
def reset_demo_state() -> dict[str, Any]:
    counts = reset_to_seed()
    SUGGESTION_CACHE.clear()
    global SUGGESTION_SEQUENCE
    SUGGESTION_SEQUENCE = 0
    return {"ok": True, "counts": counts}

@app.post("/api/google-calendar/events", response_model=GoogleCalendarEventResponse)
def create_google_calendar_event(
    payload: CreateGoogleCalendarEventRequest,
    request: Request,
) -> GoogleCalendarEventResponse:
    user_id = _require_session_user_id(request)
    schedule = get_schedule(payload.schedule_id)

    if schedule is None:
        raise ApiException(
            status_code=status.HTTP_404_NOT_FOUND,
            code="NOT_FOUND",
            message="Schedule not found",
            detail={"schedule_id": payload.schedule_id},
        )

    existing_google_event_id = schedule.google_event_id
    if existing_google_event_id and not existing_google_event_id.startswith("mock_"):
        return GoogleCalendarEventResponse(
            schedule=schedule.to_public_schedule(),
            google_event_id=existing_google_event_id,
            html_link=None,
        )

    token = get_google_token_by_user_id(user_id)
    if token is None:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Google Calendar permission is required",
        )
    if not GOOGLE_CALENDAR_WRITE_SCOPES.intersection(token.scope.split()):
        raise ApiException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="INVALID_REQUEST",
            message="Google Calendar permission is missing",
        )

    google_event = _create_google_calendar_event_with_retry(token, schedule)
    google_event_id = google_event.get("id")

    if not isinstance(google_event_id, str) or not google_event_id:
        raise ApiException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="EXTERNAL_SERVICE_UNAVAILABLE",
            message="Google Calendar did not return an event id",
        )

    schedule.google_event_id = google_event_id
    replace_schedule(schedule)

    html_link = google_event.get("htmlLink")
    return GoogleCalendarEventResponse(
        schedule=schedule.to_public_schedule(),
        google_event_id=google_event_id,
        html_link=html_link if isinstance(html_link, str) else None,
    )


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
        google_event_id=None,
        source_note_id=None,
        created_at=_now_iso(),
        rag_summary=None,
    )

    schedules.append(stored)
    save_schedules(schedules)

    return stored.to_public_schedule()

@app.get("/api/auth/me", response_model=AuthResponse)
def get_current_user(request: Request, response: Response) -> AuthResponse:
    user_id = _get_session_user_id(request)

    if user_id is None:
        request.session.clear()
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Not authenticated",
        )

    session_user = _get_session_user(request)
    user = get_user_by_id(user_id)

    if user is not None:
        auth_user = _auth_user_from_user(user)
        if session_user is not None and session_user.email != auth_user.email:
            request.session.clear()
            raise ApiException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="INVALID_REQUEST",
                message="Not authenticated",
            )
    else:
        if session_user is None:
            request.session.clear()
            raise ApiException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                code="INVALID_REQUEST",
                message="Not authenticated",
            )

        auth_user = session_user

    _delete_legacy_session_cookie(response)
    return AuthResponse(user=auth_user)

@app.post("/api/auth/logout")
def logout(request: Request, response: Response) -> dict[str, bool]:
    request.session.clear()
    _delete_legacy_session_cookie(response)
    return {"ok": True}

@app.post("/api/auth/google/code", response_model=AuthResponse)
def login_with_google_code(
    payload: GoogleAuthCodeRequest,
    request: Request,
    response: Response,
) -> AuthResponse:
    token_response = _exchange_google_code(payload.code)

    raw_id_token = token_response.get("id_token")
    if not raw_id_token:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Google ID token is missing",
        )
    access_token = token_response.get("access_token")
    if not access_token:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Google access token is missing",
        )


    id_info = _verify_google_id_token(raw_id_token)

    google_sub = id_info.get("sub")
    email = id_info.get("email")
    name = id_info.get("name")

    if not google_sub or not email:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Google account information is incomplete",
        )

    user = get_or_create_user(
        google_sub=google_sub,
        email=email,
        name=name,
        created_at=_now_iso(),
    )

    expires_in = int(token_response.get("expires_in", 3600))
    expires_at = (datetime.now(KST) + timedelta(seconds=expires_in)).isoformat(
        timespec="seconds"
    )

    existing_token = get_google_token_by_user_id(user.id)
    refresh_token = token_response.get("refresh_token")
    if refresh_token is None and existing_token is not None:
        refresh_token = existing_token.refresh_token

    upsert_google_token(
        GoogleToken(
            user_id=user.id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            scope=token_response.get("scope", ""),
            updated_at=_now_iso(),
        )
    )

    auth_user = _auth_user_from_user(user)
    request.session.clear()
    request.session["session_version"] = SESSION_VERSION
    request.session["user_id"] = user.id
    request.session["user"] = auth_user.model_dump(mode="json")

    _delete_legacy_session_cookie(response)
    return AuthResponse(user=auth_user)


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

def _get_session_user_id(request: Request) -> str | None:
    if not _has_current_session_version(request):
        return None

    user_id = request.session.get("user_id")
    if not isinstance(user_id, str) or not user_id:
        return None

    return user_id

def _require_session_user_id(request: Request) -> str:
    user_id = _get_session_user_id(request)
    if user_id is None:
        request.session.clear()
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Not authenticated",
        )

    return user_id

def _has_current_session_version(request: Request) -> bool:
    return request.session.get("session_version") == SESSION_VERSION

def _delete_legacy_session_cookie(response: Response) -> None:
    _delete_cookie(response, LEGACY_SESSION_COOKIE_NAME)

def _delete_cookie(response: Response, cookie_name: str) -> None:
    response.delete_cookie(
        key=cookie_name,
        path="/",
        secure=SESSION_COOKIE_SECURE,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
    )

def _get_session_user(request: Request) -> AuthUser | None:
    if not _has_current_session_version(request):
        return None

    raw_user = request.session.get("user")
    if not isinstance(raw_user, dict):
        return None

    try:
        session_user = AuthUser.model_validate(raw_user)
    except ValueError:
        return None

    if session_user.id != request.session.get("user_id"):
        return None

    return session_user

def _auth_user_from_user(user: User) -> AuthUser:
    return AuthUser(
        id=user.id,
        email=user.email,
        name=user.name,
        onboarding_completed=user.onboarding_completed,
    )


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

def _get_valid_google_access_token(token: GoogleToken) -> str:
    expires_at = _parse_token_expires_at(token.expires_at)
    refresh_at = datetime.now(KST) + timedelta(seconds=TOKEN_REFRESH_GRACE_SECONDS)

    if expires_at > refresh_at:
        return token.access_token

    return _refresh_google_access_token(token).access_token

def _create_google_calendar_event_with_retry(
    token: GoogleToken,
    schedule: StoredSchedule,
) -> dict[str, Any]:
    access_token = _get_valid_google_access_token(token)

    try:
        return _insert_google_calendar_event(access_token, schedule)
    except ApiException as exc:
        if (
            exc.status_code != status.HTTP_401_UNAUTHORIZED
            or token.refresh_token is None
        ):
            raise

    refreshed_token = _refresh_google_access_token(token)
    return _insert_google_calendar_event(refreshed_token.access_token, schedule)

def _refresh_google_access_token(token: GoogleToken) -> GoogleToken:
    if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
        raise ApiException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_ERROR",
            message="Google OAuth is not configured",
            detail={"client_id_configured": GOOGLE_CLIENT_ID is not None},
        )

    if token.refresh_token is None:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Google Calendar permission expired. Please login again.",
        )

    try:
        response = requests.post(
            GOOGLE_OAUTH_TOKEN_URL,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "refresh_token": token.refresh_token,
                "grant_type": "refresh_token",
            },
            timeout=10,
        )
    except requests.RequestException as exc:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="EXTERNAL_SERVICE_UNAVAILABLE",
            message="Google OAuth service is unavailable",
            detail={"type": exc.__class__.__name__},
        ) from exc

    if response.status_code >= 400:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Failed to refresh Google access token",
            detail={"status": response.status_code},
        )

    payload = response.json()
    access_token = payload.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise ApiException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="EXTERNAL_SERVICE_UNAVAILABLE",
            message="Google OAuth did not return an access token",
        )

    expires_in = int(payload.get("expires_in", 3600))
    refreshed_token = GoogleToken(
        user_id=token.user_id,
        access_token=access_token,
        refresh_token=token.refresh_token,
        expires_at=(datetime.now(KST) + timedelta(seconds=expires_in)).isoformat(
            timespec="seconds"
        ),
        scope=payload["scope"]
        if isinstance(payload.get("scope"), str)
        else token.scope,
        updated_at=_now_iso(),
    )
    upsert_google_token(refreshed_token)
    return refreshed_token

def _parse_token_expires_at(value: str) -> datetime:
    try:
        expires_at = datetime.fromisoformat(value)
    except ValueError as exc:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Stored Google token expiry is invalid. Please login again.",
        ) from exc

    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=KST)

    return expires_at.astimezone(KST)

def _insert_google_calendar_event(
    access_token: str,
    schedule: StoredSchedule,
) -> dict[str, Any]:
    event_payload = _build_google_calendar_event_payload(schedule)

    try:
        response = requests.post(
            GOOGLE_CALENDAR_EVENTS_URL,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=event_payload,
            timeout=10,
        )
    except requests.RequestException as exc:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="EXTERNAL_SERVICE_UNAVAILABLE",
            message="Google Calendar service is unavailable",
            detail={"type": exc.__class__.__name__},
        ) from exc

    if response.status_code == status.HTTP_401_UNAUTHORIZED:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Google Calendar permission expired. Please login again.",
        )

    if response.status_code == status.HTTP_403_FORBIDDEN:
        raise ApiException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="INVALID_REQUEST",
            message="Google Calendar permission is missing",
        )

    if response.status_code >= 400:
        raise ApiException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            code="EXTERNAL_SERVICE_UNAVAILABLE",
            message="Failed to create Google Calendar event",
            detail={"status": response.status_code},
        )

    return response.json()

def _build_google_calendar_event_payload(schedule: StoredSchedule) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "summary": schedule.title,
        "reminders": {
            "useDefault": False,
            "overrides": [
                {
                    "method": "popup",
                    "minutes": schedule.alert_minutes_before,
                }
            ],
        },
    }

    if schedule.location:
        payload["location"] = schedule.location

    description_lines = ["AI Smart Memo에서 추가한 일정입니다."]
    if schedule.participants:
        description_lines.append(f"참석자: {', '.join(schedule.participants)}")
    if schedule.source_note_id:
        description_lines.append(f"원본 메모 ID: {schedule.source_note_id}")
    payload["description"] = "\n".join(description_lines)

    if schedule.is_all_day:
        payload["start"] = {"date": schedule.date}
        payload["end"] = {"date": _add_days_to_date(schedule.date, 1)}
        return payload

    start_time = schedule.start_time
    if start_time is None:
        raise ApiException(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="INVALID_REQUEST",
            message="Timed schedule requires start_time",
        )

    end_time = schedule.end_time or _add_minutes_to_time(start_time, 60)
    start_datetime = _combine_date_time(schedule.date, start_time)
    end_datetime = _combine_date_time(schedule.date, end_time)

    if end_datetime <= start_datetime:
        end_datetime += timedelta(days=1)

    payload["start"] = {
        "dateTime": start_datetime.isoformat(timespec="minutes"),
        "timeZone": "Asia/Seoul",
    }
    payload["end"] = {
        "dateTime": end_datetime.isoformat(timespec="minutes"),
        "timeZone": "Asia/Seoul",
    }

    return payload

def _combine_date_time(date_value: str, time_value: str) -> datetime:
    return datetime.strptime(
        f"{date_value} {time_value}",
        "%Y-%m-%d %H:%M",
    ).replace(tzinfo=KST)

def _add_days_to_date(date_value: str, days: int) -> str:
    parsed = datetime.strptime(date_value, "%Y-%m-%d")
    return (parsed + timedelta(days=days)).strftime("%Y-%m-%d")

def _add_minutes_to_time(time_value: str, minutes: int) -> str:
    parsed = datetime.strptime(time_value, "%H:%M")
    return (parsed + timedelta(minutes=minutes)).strftime("%H:%M")

def _exchange_google_code(code: str) -> dict[str, Any]:
    if GOOGLE_CLIENT_ID is None or GOOGLE_CLIENT_SECRET is None:
        raise ApiException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_ERROR",
            message="Google OAuth is not configured",
            detail={"client_id_configured": GOOGLE_CLIENT_ID is not None},
        )

    try:
        response = requests.post(
            GOOGLE_OAUTH_TOKEN_URL,
            data={
                "code": code,
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": "postmessage",
            },
            timeout=10,
        )
    except requests.RequestException as exc:
        raise ApiException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            code="EXTERNAL_SERVICE_UNAVAILABLE",
            message="Google OAuth service is unavailable",
            detail={"type": exc.__class__.__name__},
        ) from exc

    if response.status_code >= 400:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Failed to exchange Google authorization code",
            detail={"status": response.status_code},
        )

    return response.json()

def _verify_google_id_token(raw_id_token: str) -> dict[str, Any]:
    if GOOGLE_CLIENT_ID is None:
        raise ApiException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_ERROR",
            message="Google OAuth is not configured",
        )

    try:
        return id_token.verify_oauth2_token(
            raw_id_token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError as exc:
        raise ApiException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_REQUEST",
            message="Invalid Google ID token",
        ) from exc
