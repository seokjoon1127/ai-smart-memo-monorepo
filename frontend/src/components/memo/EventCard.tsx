import { useMemoStore } from "@/stores/memoStore";
import type { ParsedEvent } from "@/types/api";
import { addMinutesToTime, diffMinutes, formatDateKo } from "@/utils/date";
import { ParticipantPicker } from "@/components/common/ParticipantPicker";

interface Props {
  event: ParsedEvent;
}

const DEFAULT_START = "09:00";
const DEFAULT_DURATION_MIN = 60;

export function EventCard({ event }: Props) {
  const updateEventField = useMemoStore((s) => s.updateEventField);
  const removeEvent = useMemoStore((s) => s.removeEvent);

  const handleAllDayToggle = () => {
    const next = !event.is_all_day;
    if (next) {
      updateEventField(event.temp_id, {
        is_all_day: true,
        start_time: null,
        end_time: null,
      });
    } else {
      const start = event.start_time ?? DEFAULT_START;
      const end =
        event.end_time ?? addMinutesToTime(start, DEFAULT_DURATION_MIN);
      updateEventField(event.temp_id, {
        is_all_day: false,
        start_time: start,
        end_time: end,
      });
    }
  };

  const handleStartChange = (value: string) => {
    if (!value) return;
    if (event.start_time && event.end_time) {
      const duration = diffMinutes(event.start_time, event.end_time);
      updateEventField(event.temp_id, {
        start_time: value,
        end_time: addMinutesToTime(value, duration),
      });
    } else {
      updateEventField(event.temp_id, { start_time: value });
    }
  };

  const handleEndChange = (value: string) => {
    updateEventField(event.temp_id, { end_time: value || null });
  };

  const handleApplySuggestion = (suggestion: string) => {
    if (event.start_time && event.end_time) {
      const duration = diffMinutes(event.start_time, event.end_time);
      updateEventField(event.temp_id, {
        start_time: suggestion,
        end_time: addMinutesToTime(suggestion, duration),
      });
    } else {
      updateEventField(event.temp_id, { start_time: suggestion });
    }
  };

  const conflict = event.conflict;
  const hasConflict = conflict.has_conflict && !event.is_all_day;

  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 mb-3">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold mb-1">{event.title}</h3>
          <p className="text-sm text-toss-gray-500">
            {formatDateKo(event.date)}
          </p>
        </div>
        {hasConflict ? (
          <span className="text-xs px-2.5 py-1 bg-toss-warning-bg text-toss-warning rounded-full font-medium">
            ⚠ 충돌
          </span>
        ) : (
          <span className="text-xs px-2.5 py-1 bg-toss-success-bg text-toss-success rounded-full font-medium">
            충돌 없음
          </span>
        )}
      </div>

      <div className="flex items-center justify-between bg-toss-gray-25 rounded-lg p-3 mb-2">
        <div>
          <p className="text-sm font-medium">종일</p>
          <p className="text-[11px] text-toss-gray-500">
            시간 없이 하루 전체로 설정
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={event.is_all_day}
            onChange={handleAllDayToggle}
          />
          <div className="w-11 h-6 bg-toss-gray-200 peer-checked:bg-toss-blue rounded-full peer transition-all relative">
            <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
      </div>

      <div
        className={`grid grid-cols-2 gap-2 mb-2 ${
          event.is_all_day ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div>
          <label className="text-[11px] text-toss-gray-500 font-medium mb-1 block">
            시작 시간
          </label>
          <input
            type="time"
            value={event.start_time ?? ""}
            onChange={(e) => handleStartChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-toss-gray-200 rounded-lg outline-none focus:border-toss-blue"
          />
        </div>
        <div>
          <label className="text-[11px] text-toss-gray-500 font-medium mb-1 block">
            종료 시간
          </label>
          <input
            type="time"
            value={event.end_time ?? ""}
            onChange={(e) => handleEndChange(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-toss-gray-200 rounded-lg outline-none focus:border-toss-blue"
          />
        </div>
      </div>

      <div className="mb-2">
        <label className="text-[11px] text-toss-gray-500 font-medium mb-1 block">
          장소
        </label>
        <input
          type="text"
          placeholder="예: 3층 회의실"
          value={event.location ?? ""}
          onChange={(e) =>
            updateEventField(event.temp_id, {
              location: e.target.value || null,
            })
          }
          className="w-full px-3 py-2 text-sm border border-toss-gray-200 rounded-lg outline-none focus:border-toss-blue placeholder:text-toss-gray-300"
        />
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-toss-gray-500 font-medium mb-1 block">
          참석자
        </label>
        <ParticipantPicker
          value={event.participants}
          onChange={(next) =>
            updateEventField(event.temp_id, { participants: next })
          }
        />
      </div>

      {hasConflict && (
        <div className="bg-toss-warning-bg rounded-lg p-3 mb-3">
          <p className="text-xs text-toss-warning font-medium mb-2">
            {conflict.conflicting_event ?? "다른 일정과 시간이 겹쳐요"}
          </p>
          {conflict.suggested_times && conflict.suggested_times.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {conflict.suggested_times.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleApplySuggestion(suggestion)}
                  className="text-xs px-3 py-1.5 bg-white border border-toss-warning text-toss-warning rounded-md font-medium"
                >
                  {suggestion}으로 변경
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          className="flex-1 py-2 bg-white border border-toss-gray-200 text-toss-gray-700 rounded-lg text-sm font-medium hover:bg-toss-gray-50"
        >
          날짜 수정
        </button>
        <button
          type="button"
          onClick={() => removeEvent(event.temp_id)}
          className="flex-1 py-2 bg-white border border-toss-gray-200 text-toss-gray-500 rounded-lg text-sm font-medium hover:bg-toss-gray-50"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
