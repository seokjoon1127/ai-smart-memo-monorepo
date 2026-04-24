from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


EventType = Literal["meeting", "deadline", "event", "other"]


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


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
    user_id: str
    content: str
    created_at: str


class ConflictInfo(ApiModel):
    has_conflict: bool
    conflicting_event: str | None = None
    suggested_times: list[str] | None = None


class ParsedEvent(ApiModel):
    temp_id: str
    title: str
    date: str
    time: str | None = None
    duration_min: int | None = None
    type: EventType
    participants: list[str] = Field(default_factory=list)
    conflict: ConflictInfo


class ParseResult(ApiModel):
    note_id: str
    events: list[ParsedEvent] = Field(default_factory=list)


class ApprovedEvent(ApiModel):
    temp_id: str
    title: str
    date: str
    time: str | None = None
    duration_min: int | None = None
    type: EventType
    participants: list[str] = Field(default_factory=list)


class ParseNoteRequest(ApiModel):
    note_id: str


class CreateSchedulesRequest(ApiModel):
    note_id: str
    events: list[ApprovedEvent] = Field(default_factory=list)


class RelatedNote(ApiModel):
    note_id: str
    content: str
    relevance_score: float
    created_at: str


class RagSummary(ApiModel):
    summary: str
    source_note_ids: list[str] = Field(default_factory=list)
    generated_at: str


class Schedule(ApiModel):
    id: str
    user_id: str
    title: str
    date: str
    time: str | None = None
    duration_min: int | None = None
    type: EventType
    source_note_id: str
    created_at: str

    def to_stored_schedule(self) -> "StoredSchedule":
        return StoredSchedule(**self.model_dump(), rag_summary=None)


class StoredSchedule(Schedule):
    rag_summary: RagSummary | None = None

    def to_public_schedule(self) -> Schedule:
        return Schedule(**self.model_dump(exclude={"rag_summary"}))


class ScheduleDetail(Schedule):
    related_notes: list[RelatedNote] = Field(default_factory=list)
    rag_summary: RagSummary | None = None
