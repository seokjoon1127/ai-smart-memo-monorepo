from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

EventType = Literal["meeting", "deadline", "event", "other"]
DocCategory = Literal["meeting", "project", "report", "memo"]
SuggestionType = Literal["follow_up_meeting", "review_session", "task"]
ApiErrorCode = Literal[
    "INVALID_REQUEST",
    "NOT_FOUND",
    "CONFLICT_DETECTED",
    "LLM_PARSE_FAILED",
    "EXTERNAL_SERVICE_UNAVAILABLE",
    "INTERNAL_ERROR",
]


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorBody(ApiModel):
    code: ApiErrorCode
    message: str
    detail: dict | None = None


class ApiError(ApiModel):
    error: ErrorBody


class CreateNoteRequest(ApiModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("content must not be empty")
        return value


class Note(ApiModel):
    id: str
    content: str = Field(..., min_length=1, max_length=2000)
    created_at: str
    indexed: bool = False
    owner_user_id: str | None = None


class ConflictInfo(ApiModel):
    has_conflict: bool
    conflicting_event: str | None = None
    suggested_times: list[str] | None = None


class ParsedEvent(ApiModel):
    temp_id: str
    title: str
    date: str
    is_all_day: bool
    start_time: str | None = None
    end_time: str | None = None
    type: EventType
    participants: list[str] = Field(default_factory=list)
    location: str | None = None
    conflict: ConflictInfo


class ParseRequest(ApiModel):
    note_id: str


class ParseResponse(ApiModel):
    note_id: str
    events: list[ParsedEvent] = Field(default_factory=list)


class CreateScheduleEventInput(ApiModel):
    title: str
    date: str
    is_all_day: bool
    start_time: str | None = None
    end_time: str | None = None
    type: EventType
    participants: list[str] = Field(default_factory=list)
    location: str | None = None
    alert_minutes_before: int = Field(..., ge=0)
    source_note_id: str | None = None


class CreateSchedulesRequest(ApiModel):
    events: list[CreateScheduleEventInput] = Field(..., min_length=1)


class Schedule(ApiModel):
    id: str
    title: str
    date: str
    is_all_day: bool
    start_time: str | None = None
    end_time: str | None = None
    type: EventType
    participants: list[str] = Field(default_factory=list)
    location: str | None = None
    alert_minutes_before: int = Field(..., ge=0)
    google_event_id: str | None = None
    source_note_id: str | None = None
    created_at: str
    can_delete: bool = False


class StoredSchedule(Schedule):
    owner_user_id: str | None = None
    rag_summary: "RagSummary | None" = None

    def to_public_schedule(self, viewer_user_id: str | None = None) -> Schedule:
        return Schedule(
            **self.model_dump(
                exclude={"owner_user_id", "rag_summary", "can_delete"},
            ),
            can_delete=(
                self.owner_user_id is not None
                and self.owner_user_id == viewer_user_id
            ),
        )


class ScheduleFailure(ApiModel):
    schedule_id: str
    reason: str


class CreateSchedulesResponse(ApiModel):
    schedules: list[Schedule] = Field(default_factory=list)
    failed: list[ScheduleFailure] = Field(default_factory=list)


class RelatedDoc(ApiModel):
    doc_id: str
    title: str
    preview: str
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    created_at: str


class Suggestion(ApiModel):
    suggestion_id: str
    type: SuggestionType
    title: str
    suggested_date: str
    suggested_start_time: str | None = None
    reason: str
    based_on_schedule_id: str


class ScheduleDetail(Schedule):
    related_docs: list[RelatedDoc] = Field(default_factory=list)
    ai_suggestion: Suggestion | None = None


class GetConflictsQuery(ApiModel):
    date: str
    start_time: str | None = None
    end_time: str | None = None


class ShareDoc(ApiModel):
    id: str
    title: str = Field(..., min_length=1, max_length=200)
    category: DocCategory
    author: str
    preview: str
    tags: list[str] = Field(default_factory=list)
    created_at: str
    indexed: bool = False


class ShareDocDetail(ShareDoc):
    full_content: str


class GetShareBoxResponse(ApiModel):
    items: list[ShareDoc] = Field(default_factory=list)
    total: int
    limit: int
    offset: int


class CreateShareDocRequest(ApiModel):
    title: str = Field(..., min_length=1, max_length=200)
    category: DocCategory
    author: str
    full_content: str = Field(..., min_length=1)
    tags: list[str] = Field(default_factory=list)


class AcceptSuggestionRequest(ApiModel):
    alert_minutes_before: int = Field(..., ge=0)

class CreateGoogleCalendarEventRequest(ApiModel):
    schedule_id: str

class GoogleCalendarEventResponse(ApiModel):
    schedule: Schedule
    google_event_id: str
    html_link: str | None = None

class RagSummary(ApiModel):
    summary: str
    source_note_ids: list[str] = Field(default_factory=list)
    generated_at: str

class User(ApiModel):
    id: str
    google_sub: str
    email: str
    name: str | None = None
    onboarding_completed: bool = False
    created_at: str

class GoogleToken(ApiModel):
    user_id: str
    access_token: str
    expires_at: str
    refresh_token: str | None = None
    scope: str
    updated_at: str

class GoogleAuthCodeRequest(ApiModel):
    code: str

class AuthUser(ApiModel):
    id: str
    email: str
    name: str | None = None
    onboarding_completed: bool


class AuthResponse(ApiModel):
    user: AuthUser
