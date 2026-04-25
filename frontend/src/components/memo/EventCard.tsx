import { useMemoStore, type DraftEvent } from "@/stores/memoStore";
import { formatDateKo, addMinutesToTime, diffMinutes } from "@/utils/date";

interface Props {
  draft: DraftEvent;
}

export function EventCard({ draft }: Props) {
  const updateDraft = useMemoStore((s) => s.updateDraft);
  const removeDraft = useMemoStore((s) => s.removeDraft);

  const handleAllDayToggle = () => {
    const next = !draft.isAllDay;
    updateDraft(draft.temp_id, {
      isAllDay: next,
      time: next ? null : draft.time ?? "09:00",
      duration_min: next ? null : draft.duration_min ?? 60,
      endTime: next
        ? null
        : draft.endTime ?? addMinutesToTime(draft.time ?? "09:00", 60),
    });
  };

  const handleStartChange = (value: string) => {
    const start = value || "09:00";
    const duration = draft.duration_min ?? 60;
    updateDraft(draft.temp_id, {
      time: start,
      endTime: addMinutesToTime(start, duration),
    });
  };

  const handleEndChange = (value: string) => {
    if (!draft.time || !value) return;
    const duration = diffMinutes(draft.time, value);
    updateDraft(draft.temp_id, {
      endTime: value,
      duration_min: duration > 0 ? duration : draft.duration_min,
    });
  };

  const handleApplySuggestion = (suggestion: string) => {
    const duration = draft.duration_min ?? 60;
    updateDraft(draft.temp_id, {
      time: suggestion,
      endTime: addMinutesToTime(suggestion, duration),
    });
  };

  const conflict = draft.conflict;
  const hasConflict = conflict.has_conflict && !draft.isAllDay;

  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 mb-3">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold mb-1">{draft.title}</h3>
          <p className="text-sm text-toss-gray-500">
            {formatDateKo(draft.date)}
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
            checked={draft.isAllDay}
            onChange={handleAllDayToggle}
          />
          <div className="w-11 h-6 bg-toss-gray-200 peer-checked:bg-toss-blue rounded-full peer transition-all relative">
            <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
      </div>

      <div
        className={`grid grid-cols-2 gap-2 mb-2 ${
          draft.isAllDay ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div>
          <label className="text-[11px] text-toss-gray-500 font-medium mb-1 block">
            시작 시간
          </label>
          <input
            type="time"
            value={draft.time ?? ""}
            onChange={(event) => handleStartChange(event.target.value)}
            className="w-full px-3 py-2 text-sm border border-toss-gray-200 rounded-lg outline-none focus:border-toss-blue"
          />
        </div>
        <div>
          <label className="text-[11px] text-toss-gray-500 font-medium mb-1 block">
            종료 시간
          </label>
          <input
            type="time"
            value={draft.endTime ?? ""}
            onChange={(event) => handleEndChange(event.target.value)}
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
          value={draft.location}
          onChange={(event) =>
            updateDraft(draft.temp_id, { location: event.target.value })
          }
          className="w-full px-3 py-2 text-sm border border-toss-gray-200 rounded-lg outline-none focus:border-toss-blue placeholder:text-toss-gray-300"
        />
      </div>

      <div className="mb-3">
        <label className="text-[11px] text-toss-gray-500 font-medium mb-1 block">
          참석자
        </label>
        <input
          type="text"
          placeholder="예: 김팀장, 이수진, 박민수 (쉼표로 구분)"
          value={draft.participantsText}
          onChange={(event) =>
            updateDraft(draft.temp_id, {
              participantsText: event.target.value,
            })
          }
          className="w-full px-3 py-2 text-sm border border-toss-gray-200 rounded-lg outline-none focus:border-toss-blue placeholder:text-toss-gray-300"
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
          onClick={() => removeDraft(draft.temp_id)}
          className="flex-1 py-2 bg-white border border-toss-gray-200 text-toss-gray-500 rounded-lg text-sm font-medium hover:bg-toss-gray-50"
        >
          삭제
        </button>
      </div>
    </div>
  );
}
