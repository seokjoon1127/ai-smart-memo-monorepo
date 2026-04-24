from __future__ import annotations

from typing import Sequence

from schemas import ApprovedEvent, ConflictInfo, StoredSchedule

SUGGESTION_START_MINUTE = 9 * 60
SUGGESTION_END_MINUTE = 21 * 60
SUGGESTION_STEP = 30
MAX_SUGGESTIONS = 3


def check_conflicts(
    *,
    date: str,
    time: str | None,
    duration: int | None,
    schedules: Sequence[StoredSchedule],
) -> ConflictInfo:
    if time is None or duration is None:
        return ConflictInfo(has_conflict=False)

    request_start = _time_to_minutes(time)
    request_end = request_start + duration

    for schedule in schedules:
        if schedule.date != date or schedule.time is None or schedule.duration_min is None:
            continue

        existing_start = _time_to_minutes(schedule.time)
        existing_end = existing_start + schedule.duration_min
        if _overlaps(request_start, request_end, existing_start, existing_end):
            return ConflictInfo(
                has_conflict=True,
                conflicting_event=_format_schedule_label(schedule.title, schedule.time, schedule.duration_min),
                suggested_times=_suggested_times(date, duration, schedules, request_start),
            )

    return ConflictInfo(has_conflict=False)


def find_schedule_conflicts(
    existing_schedules: Sequence[StoredSchedule],
    requested_events: Sequence[ApprovedEvent],
) -> list[dict]:
    conflicts: list[dict] = []
    for index, event in enumerate(requested_events):
        if event.time is None or event.duration_min is None:
            continue

        event_conflict = check_conflicts(
            date=event.date,
            time=event.time,
            duration=event.duration_min,
            schedules=existing_schedules,
        )
        if event_conflict.has_conflict:
            conflicts.append({"temp_id": event.temp_id, "conflict": event_conflict.model_dump(mode="json")})
            continue

        for other_index, other_event in enumerate(requested_events):
            if index == other_index:
                continue
            if event.date != other_event.date or other_event.time is None or other_event.duration_min is None:
                continue

            if _events_overlap(event, other_event):
                conflicts.append(
                    {
                        "temp_id": event.temp_id,
                        "conflict": ConflictInfo(
                            has_conflict=True,
                            conflicting_event=_format_schedule_label(
                                other_event.title,
                                other_event.time,
                                other_event.duration_min,
                            ),
                            suggested_times=[],
                        ).model_dump(mode="json"),
                    }
                )
                break

    unique_conflicts: list[dict] = []
    seen_temp_ids: set[str] = set()
    for conflict in conflicts:
        temp_id = conflict["temp_id"]
        if temp_id not in seen_temp_ids:
            unique_conflicts.append(conflict)
            seen_temp_ids.add(temp_id)
    return unique_conflicts


def _events_overlap(left: ApprovedEvent, right: ApprovedEvent) -> bool:
    left_start = _time_to_minutes(left.time or "00:00")
    right_start = _time_to_minutes(right.time or "00:00")
    left_end = left_start + (left.duration_min or 0)
    right_end = right_start + (right.duration_min or 0)
    return _overlaps(left_start, left_end, right_start, right_end)


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


def _format_schedule_label(title: str, time: str, duration_min: int) -> str:
    start = _time_to_minutes(time)
    end = start + duration_min
    return f"{title} {_minutes_to_time(start)}~{_minutes_to_time(end)}"


def _suggested_times(
    date: str,
    duration: int,
    schedules: Sequence[StoredSchedule],
    request_start: int,
) -> list[str]:
    suggestions: list[str] = []
    start_minute = max(SUGGESTION_START_MINUTE, request_start + SUGGESTION_STEP)
    for candidate_start in range(start_minute, SUGGESTION_END_MINUTE + 1, SUGGESTION_STEP):
        candidate_end = candidate_start + duration
        if candidate_end > SUGGESTION_END_MINUTE:
            break

        has_conflict = False
        for schedule in schedules:
            if schedule.date != date or schedule.time is None or schedule.duration_min is None:
                continue
            schedule_start = _time_to_minutes(schedule.time)
            schedule_end = schedule_start + schedule.duration_min
            if _overlaps(candidate_start, candidate_end, schedule_start, schedule_end):
                has_conflict = True
                break

        if not has_conflict:
            suggestions.append(_minutes_to_time(candidate_start))
        if len(suggestions) >= MAX_SUGGESTIONS:
            break

    return suggestions
