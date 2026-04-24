from __future__ import annotations

from zoneinfo import ZoneInfo

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from schemas import (
    ConflictInfo,
    CreateNoteRequest,
    CreateSchedulesRequest,
    Note,
    ParseNoteRequest,
    ParseResult,
    ParsedEvent,
    Schedule,
    ScheduleDetail,
)
from services.ai_service import (
    AIServiceUnavailable,
    generate_rag_summary,
    parse_note_content,
    rebuild_note_index,
    search_related_notes,
)
from services.calendar import check_conflicts, find_schedule_conflicts
from services.db_handler import (
    create_note_id,
    create_schedule_id,
    delete_note_by_user,
    get_note_by_user,
    get_schedule_by_user,
    invalidate_rag_summary_cache,
    list_notes_by_user,
    list_schedules_by_user,
    load_notes,
    load_schedules,
    replace_schedule,
    save_notes,
    save_schedules,
)

load_dotenv()

KST = ZoneInfo("Asia/Seoul")

app = FastAPI(title="AI Smart Memo Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _now_iso() -> str:
    return __import__("datetime").datetime.now(KST).isoformat(timespec="seconds")


def get_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    if x_user_id is None or not x_user_id.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-User-Id header is required",
        )
    return x_user_id.strip()


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"ok": "true"}


@app.get("/api/notes", response_model=list[Note])
def get_notes(user_id: str = Depends(get_user_id)) -> list[Note]:
    return list_notes_by_user(user_id)


@app.post("/api/notes", response_model=Note, status_code=status.HTTP_201_CREATED)
def create_note(
    payload: CreateNoteRequest,
    user_id: str = Depends(get_user_id),
) -> Note:
    notes = load_notes()
    note = Note(
        id=create_note_id(notes),
        user_id=user_id,
        content=payload.content.strip(),
        created_at=_now_iso(),
    )
    notes.append(note)
    save_notes(notes)
    invalidate_rag_summary_cache(user_id)
    rebuild_note_index(load_notes())
    return note


@app.delete("/api/notes/{note_id}")
def delete_note(note_id: str, user_id: str = Depends(get_user_id)) -> dict[str, bool]:
    deleted = delete_note_by_user(note_id, user_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    invalidate_rag_summary_cache(user_id)
    rebuild_note_index(load_notes())
    return {"ok": True}


@app.post("/api/parse", response_model=ParseResult)
def parse_note(
    payload: ParseNoteRequest,
    user_id: str = Depends(get_user_id),
) -> ParseResult:
    note = get_note_by_user(payload.note_id, user_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    try:
        extracted_events = parse_note_content(note.content)
    except AIServiceUnavailable as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    existing_schedules = list_schedules_by_user(user_id)
    parsed_events: list[ParsedEvent] = []
    for index, event in enumerate(extracted_events, start=1):
        conflict = check_conflicts(
            date=event.date,
            time=event.time,
            duration=event.duration_min,
            schedules=existing_schedules,
        )
        parsed_events.append(
            ParsedEvent(
                temp_id=f"evt_tmp_{index}",
                title=event.title,
                date=event.date,
                time=event.time,
                duration_min=event.duration_min,
                type=event.type,
                participants=event.participants,
                conflict=conflict,
            )
        )

    return ParseResult(note_id=note.id, events=parsed_events)


@app.get("/api/calendar/conflicts", response_model=ConflictInfo)
def get_calendar_conflicts(
    date: str = Query(...),
    time: str = Query(...),
    duration: int = Query(..., gt=0),
    user_id: str = Depends(get_user_id),
) -> ConflictInfo:
    schedules = list_schedules_by_user(user_id)
    return check_conflicts(date=date, time=time, duration=duration, schedules=schedules)


@app.post("/api/schedules", response_model=list[Schedule], status_code=status.HTTP_201_CREATED)
def create_schedules(
    payload: CreateSchedulesRequest,
    user_id: str = Depends(get_user_id),
):
    note = get_note_by_user(payload.note_id, user_id)
    if note is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    existing_schedules = list_schedules_by_user(user_id)
    conflicts = find_schedule_conflicts(existing_schedules, payload.events)
    if conflicts:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "detail": "Schedule conflict detected",
                "conflicts": conflicts,
            },
        )

    schedules = load_schedules()
    created: list[Schedule] = []
    for event in payload.events:
        schedule = Schedule(
            id=create_schedule_id(schedules),
            user_id=user_id,
            title=event.title,
            date=event.date,
            time=event.time,
            duration_min=event.duration_min,
            type=event.type,
            source_note_id=payload.note_id,
            created_at=_now_iso(),
        )
        stored_schedule = schedule.to_stored_schedule()
        schedules.append(stored_schedule)
        created.append(schedule)

    save_schedules(schedules)
    return created


@app.get("/api/schedules", response_model=list[Schedule])
def get_schedules(user_id: str = Depends(get_user_id)) -> list[Schedule]:
    return [schedule.to_public_schedule() for schedule in list_schedules_by_user(user_id)]


@app.get("/api/schedules/{schedule_id}", response_model=ScheduleDetail)
def get_schedule_detail(schedule_id: str, user_id: str = Depends(get_user_id)) -> ScheduleDetail:
    stored_schedule = get_schedule_by_user(schedule_id, user_id)
    if stored_schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    notes = list_notes_by_user(user_id)
    source_note = get_note_by_user(stored_schedule.source_note_id, user_id)
    related_notes = search_related_notes(
        schedule=stored_schedule.to_public_schedule(),
        source_note=source_note,
        notes=notes,
        user_id=user_id,
    )

    rag_summary = stored_schedule.rag_summary
    if rag_summary is None and related_notes:
        try:
            rag_summary = generate_rag_summary(stored_schedule.to_public_schedule(), related_notes)
        except AIServiceUnavailable:
            rag_summary = None

        if rag_summary is not None:
            stored_schedule.rag_summary = rag_summary
            replace_schedule(stored_schedule)

    return ScheduleDetail(
        **stored_schedule.to_public_schedule().model_dump(),
        related_notes=related_notes,
        rag_summary=rag_summary,
    )
