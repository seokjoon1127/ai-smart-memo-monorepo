import { useMutation } from "@tanstack/react-query";
import { useMemoStore, type DraftEvent } from "@/stores/memoStore";
import { useScheduleStore } from "@/stores/scheduleStore";
import {
  ScheduleConflictError,
  createSchedules,
} from "@/services/scheduleApi";
import { useToast } from "@/hooks/useToast";
import type { ApprovedEvent } from "@/types/api";
import { EventCard } from "./EventCard";

function toApprovedEvent(draft: DraftEvent): ApprovedEvent {
  const participants = draft.participantsText
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return {
    temp_id: draft.temp_id,
    title: draft.title,
    date: draft.date,
    time: draft.isAllDay ? null : draft.time ?? null,
    duration_min: draft.isAllDay ? null : draft.duration_min ?? null,
    type: draft.type,
    participants,
  };
}

export function PreviewCardList() {
  const noteId = useMemoStore((s) => s.noteId);
  const drafts = useMemoStore((s) => s.drafts);
  const setStep = useMemoStore((s) => s.setStep);
  const setRecentlyCreated = useScheduleStore((s) => s.setRecentlyCreated);
  const showToast = useToast();

  const visibleDrafts = drafts.filter((draft) => !draft.removed);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!noteId) throw new Error("note_id가 없습니다");
      return createSchedules(noteId, visibleDrafts.map(toApprovedEvent));
    },
    onSuccess: (schedules) => {
      setRecentlyCreated(schedules);
      setStep(3);
    },
    onError: (error: unknown) => {
      if (error instanceof ScheduleConflictError) {
        showToast("아직 충돌 중인 일정이 있어요");
        return;
      }
      const message =
        error instanceof Error ? error.message : "일정 등록에 실패했어요";
      showToast(message);
    },
  });

  return (
    <div className="max-w-3xl mx-auto">
      <p className="text-sm text-toss-blue font-medium mb-2">STEP 2 / 3</p>
      <h2 className="text-3xl font-bold mb-3 leading-tight">
        {visibleDrafts.length}개의 일정을 찾았어요
      </h2>
      <p className="text-base text-toss-gray-500 mb-8">
        필요한 정보를 직접 입력하거나 비워둘 수 있어요
      </p>

      {visibleDrafts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-10 text-center text-sm text-toss-gray-500 mb-6">
          등록할 일정이 없어요. 메모를 다시 작성해주세요.
        </div>
      ) : (
        visibleDrafts.map((draft) => (
          <EventCard key={draft.temp_id} draft={draft} />
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
          disabled={visibleDrafts.length === 0 || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="flex-1 py-4 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {mutation.isPending
            ? "등록 중..."
            : `${visibleDrafts.length}개 일정 모두 등록`}
        </button>
      </div>
    </div>
  );
}
