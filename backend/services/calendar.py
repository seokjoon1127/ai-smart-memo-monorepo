from __future__ import annotations

from typing import Sequence

from schemas import ConflictInfo, CreateScheduleEventInput, StoredSchedule

DEFAULT_DURATION_MIN = 60
SUGGESTION_START_MINUTE = 9 * 60
SUGGESTION_END_MINUTE = 21 * 60
SUGGESTION_STEP = 30
MAX_SUGGESTIONS = 3


def check_conflicts(
    *,
    date: str,
    start_time: str | None,
    end_time: str | None,
    schedules: Sequence[StoredSchedule],
    assume_default_duration: bool = False,
) -> ConflictInfo:
    request_window = _build_window(
        start_time,
        end_time,
        assume_default_duration=assume_default_duration,
    )
    if request_window is None:
        return ConflictInfo(has_conflict=False)

    request_start, request_end = request_window
    duration = request_end - request_start

    for schedule in schedules:
        if schedule.date != date:
            continue

        schedule_window = _schedule_window(schedule)
        if schedule_window is None:
            continue

        schedule_start, schedule_end = schedule_window
        if _overlaps(request_start, request_end, schedule_start, schedule_end):
            return ConflictInfo(
                has_conflict=True,
                conflicting_event=_format_schedule_label(schedule),
                suggested_times=_suggested_times(
                    date=date,
                    duration=duration,
                    schedules=schedules,
                    start_from_minute=schedule_end,
                ),
            )

    return ConflictInfo(has_conflict=False)


def find_schedule_conflicts(
    existing_schedules: Sequence[StoredSchedule],
    requested_events: Sequence[CreateScheduleEventInput],
) -> list[dict]:
    conflicts: list[dict] = []

    for index, event in enumerate(requested_events):
        if event.is_all_day:
            continue

        event_window = _build_window(
            event.start_time,
            event.end_time,
            assume_default_duration=True,
        )
        if event_window is None:
            continue

        conflict = check_conflicts(
            date=event.date,
            start_time=event.start_time,
            end_time=event.end_time,
            schedules=existing_schedules,
            assume_default_duration=True,
        )
        if conflict.has_conflict:
            conflicts.append(
                {
                    "index": index,
                    "title": event.title,
                    "conflict": conflict.model_dump(mode="json"),
                }
            )
            continue

        for other_index, other_event in enumerate(requested_events):
            if index == other_index:
                continue
            if event.date != other_event.date:
                continue
            if other_event.is_all_day:
                continue

            other_window = _build_window(
                other_event.start_time,
                other_event.end_time,
                assume_default_duration=True,
            )
            if other_window is None:
                continue

            if _overlaps(event_window[0], event_window[1], other_window[0], other_window[1]):
                conflicts.append(
                    {
                        "index": index,
                        "title": event.title,
                        "conflict": ConflictInfo(
                            has_conflict=True,
                            conflicting_event=_format_event_label(other_event),
                            suggested_times=[],
                        ).model_dump(mode="json"),
                    }
                )
                break

    return conflicts


def _schedule_window(schedule: StoredSchedule) -> tuple[int, int] | None:
    if schedule.is_all_day:
        return None

    return _build_window(
        schedule.start_time,
        schedule.end_time,
        assume_default_duration=True,
    )


def _build_window(
    start_time: str | None,
    end_time: str | None,
    *,
    assume_default_duration: bool,
) -> tuple[int, int] | None:
    if start_time is None:
        return None

    start = _time_to_minutes(start_time)

    if end_time is None:
        if not assume_default_duration:
            return None
        end = start + DEFAULT_DURATION_MIN
    else:
        end = _time_to_minutes(end_time)

    if end <= start:
        raise ValueError("end_time must be after start_time")

    return start, end


def _overlaps(start_a: int, end_a: int, start_b: int, end_b: int) -> bool:
    return start_a < end_b and start_b < end_a


def _time_to_minutes(value: str) -> int:
    hour_text, minute_text = value.split(":")
    hour = int(hour_text)
    minute = int(minute_text)

    if hour < 0 or hour > 23 or minute < 0 or minute > 59:
        raise ValueError("time must be in HH:mm format")

    return hour * 60 + minute


def _minutes_to_time(value: int) -> str:
    hour = value // 60
    minute = value % 60
    return f"{hour:02d}:{minute:02d}"


def _ceil_to_step(value: int, step: int) -> int:
    remainder = value % step
    if remainder == 0:
        return value
    return value + (step - remainder)


def _format_schedule_label(schedule: StoredSchedule) -> str:
    return _format_label(schedule.title, schedule.start_time, schedule.end_time)


def _format_event_label(event: CreateScheduleEventInput) -> str:
    return _format_label(event.title, event.start_time, event.end_time)


def _format_label(title: str, start_time: str | None, end_time: str | None) -> str:
    if start_time is None:
        return title

    start = _time_to_minutes(start_time)
    end = (
        _time_to_minutes(end_time)
        if end_time is not None
        else start + DEFAULT_DURATION_MIN
    )

    return f"{title} {_minutes_to_time(start)}~{_minutes_to_time(end)}"


def _suggested_times(
    *,
    date: str,
    duration: int,
    schedules: Sequence[StoredSchedule],
    start_from_minute: int,
) -> list[str]:
    suggestions: list[str] = []

    candidate_start = max(
        SUGGESTION_START_MINUTE,
        _ceil_to_step(start_from_minute, SUGGESTION_STEP),
    )

    while candidate_start + duration <= SUGGESTION_END_MINUTE:
        candidate_end = candidate_start + duration

        has_conflict = False
        for schedule in schedules:
            if schedule.date != date:
                continue

            schedule_window = _schedule_window(schedule)
            if schedule_window is None:
                continue

            if _overlaps(candidate_start, candidate_end, schedule_window[0], schedule_window[1]):
                has_conflict = True
                break

        if not has_conflict:
            suggestions.append(_minutes_to_time(candidate_start))

        if len(suggestions) >= MAX_SUGGESTIONS:
            break

        candidate_start += SUGGESTION_STEP

    return suggestions
