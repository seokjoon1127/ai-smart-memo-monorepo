import { useMemoStore } from "@/stores/memoStore";
import { useScheduleStore } from "@/stores/scheduleStore";
import type {
  CreateScheduleEventInput,
  EventType,
  ParsedEvent,
} from "@/types/api";
import { EventCard } from "./EventCard";

const DEFAULT_ALERT_MIN: Record<EventType, number> = {
  meeting: 10,
  deadline: 1440,
  event: 10,
  other: 10,
};

function toEventInput(
  event: ParsedEvent,
  noteId: string,
): CreateScheduleEventInput {
  return {
    title: event.title,
    date: event.date,
    is_all_day: event.is_all_day,
    start_time: event.is_all_day ? null : event.start_time,
    end_time: event.is_all_day ? null : event.end_time,
    type: event.type,
    participants: event.participants,
    location: event.location,
    alert_minutes_before: DEFAULT_ALERT_MIN[event.type],
    source_note_id: noteId,
  };
}

export function PreviewCardList() {
  const noteId = useMemoStore((s) => s.noteId);
  const parsedEvents = useMemoStore((s) => s.parsedEvents);
  const setStep = useMemoStore((s) => s.setStep);
  const createSchedules = useScheduleStore((s) => s.createSchedules);
  const status = useScheduleStore((s) => s.status);

  const isSubmitting = status === "submitting";

  const handleCreate = async () => {
    if (!noteId || parsedEvents.length === 0) return;
    const events = parsedEvents.map((event) => toEventInput(event, noteId));
    const result = await createSchedules(events);
    if (result) setStep(3);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <p className="text-sm text-toss-blue font-medium mb-2">STEP 2 / 3</p>
      <h2 className="text-3xl font-bold mb-3 leading-tight">
        {parsedEvents.length}개의 일정을 찾았어요
      </h2>
      <p className="text-base text-toss-gray-500 mb-8">
        필요한 정보를 직접 입력하거나 비워둘 수 있어요
      </p>

      {parsedEvents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-10 text-center text-sm text-toss-gray-500 mb-6">
          등록할 일정이 없어요. 메모를 다시 작성해주세요.
        </div>
      ) : (
        parsedEvents.map((event) => (
          <EventCard key={event.temp_id} event={event} />
        ))
      )}

      <div className="flex gap-2 mt-3">
        <button
          type="button"
          onClick={() => setStep(1)}
          className="px-6 py-4 bg-toss-gray-50 hover:bg-toss-gray-100 text-toss-gray-700 rounded-xl font-medium text-base"
        >
          취소
        </button>
        <button
          type="button"
          disabled={parsedEvents.length === 0 || isSubmitting}
          onClick={handleCreate}
          className="flex-1 py-4 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting
            ? "등록 중..."
            : `${parsedEvents.length}개 일정 모두 등록`}
        </button>
      </div>
    </div>
  );
}
