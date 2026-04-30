import { useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useUiStore } from "@/stores/uiStore";
import { formatDateKo, formatTimeKo } from "@/utils/date";
import { RelatedDocCard } from "@/components/memo/RelatedDocCard";
import { SuggestionBox } from "@/components/memo/SuggestionBox";
import type { EventType } from "@/types/api";

interface Props {
  scheduleId: string;
  onClose: () => void;
}

const typeBadge: Record<EventType, { label: string; className: string }> = {
  meeting: { label: "회의", className: "bg-toss-blue-light text-toss-blue" },
  deadline: {
    label: "마감",
    className: "bg-toss-warning-bg text-toss-warning",
  },
  event: { label: "이벤트", className: "bg-toss-purple-bg text-toss-purple" },
  other: { label: "기타", className: "bg-toss-gray-50 text-toss-gray-600" },
};

function formatAlert(minutes: number): string {
  if (minutes >= 1440) return `${Math.round(minutes / 1440)}일 전`;
  if (minutes >= 60) return `${Math.round(minutes / 60)}시간 전`;
  return `${minutes}분 전`;
}

function timeRange(
  isAllDay: boolean,
  start: string | null,
  end: string | null,
): string {
  if (isAllDay) return "종일";
  if (!start) return "시간 미정";
  if (!end) return formatTimeKo(start);
  return `${formatTimeKo(start)} ~ ${formatTimeKo(end)}`;
}

export function ScheduleDetailModal({ scheduleId, onClose }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const detail = useScheduleStore((s) => s.scheduleDetails[scheduleId]);
  const fetchScheduleDetail = useScheduleStore((s) => s.fetchScheduleDetail);
  const deleteSchedule = useScheduleStore((s) => s.deleteSchedule);
  const showToast = useUiStore((s) => s.showToast);

  useEffect(() => {
    void fetchScheduleDetail(scheduleId);
  }, [scheduleId, fetchScheduleDetail]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDelete = async () => {
    if (!detail?.can_delete || isDeleting) return;

    setIsDeleting(true);
    const deleted = await deleteSchedule(detail.id);
    setIsDeleting(false);

    if (!deleted) return;

    showToast("일정을 삭제했어요");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 shadow-xl max-h-[85vh] overflow-y-auto">
        {!detail ? (
          <div className="p-7 text-center text-sm text-toss-gray-400">
            일정 상세 불러오는 중...
          </div>
        ) : (
          <div className="p-7">
            <div className="flex items-start justify-between mb-5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${typeBadge[detail.type].className}`}
                  >
                    {typeBadge[detail.type].label}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-1">{detail.title}</h3>
                <p className="text-sm text-toss-gray-500">
                  {formatDateKo(detail.date)} ·{" "}
                  {timeRange(
                    detail.is_all_day,
                    detail.start_time,
                    detail.end_time,
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {detail.can_delete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="h-8 w-8 flex items-center justify-center rounded-lg text-toss-gray-500 hover:bg-toss-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="일정 삭제"
                    title="일정 삭제"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-100 text-toss-gray-500"
                  aria-label="닫기"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="bg-toss-gray-25 rounded-lg p-3">
                <p className="text-xs text-toss-gray-500 mb-1">참석자</p>
                <p
                  className={`text-sm font-medium ${
                    detail.participants.length === 0
                      ? "text-toss-gray-300"
                      : ""
                  }`}
                >
                  {detail.participants.length === 0
                    ? "미설정"
                    : detail.participants.join(", ")}
                </p>
              </div>
              <div className="bg-toss-gray-25 rounded-lg p-3">
                <p className="text-xs text-toss-gray-500 mb-1">알림</p>
                <p className="text-sm font-medium">
                  {formatAlert(detail.alert_minutes_before)}
                </p>
              </div>
              <div className="bg-toss-gray-25 rounded-lg p-3 col-span-2">
                <p className="text-xs text-toss-gray-500 mb-1">장소</p>
                <p
                  className={`text-sm font-medium ${
                    !detail.location ? "text-toss-gray-300" : ""
                  }`}
                >
                  {detail.location ?? "미설정"}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium mb-2">
                📎 연관 문서{" "}
                <span className="text-xs text-toss-gray-400 font-normal ml-1">
                  from ShareBox
                </span>
              </p>
              {detail.related_docs.length === 0 ? (
                <div className="bg-toss-gray-25 rounded-lg p-3 text-xs text-toss-gray-400">
                  연관 문서가 없어요.
                </div>
              ) : (
                detail.related_docs.map((doc) => (
                  <RelatedDocCard key={doc.doc_id} doc={doc} />
                ))
              )}
            </div>

            {detail.ai_suggestion && (
              <SuggestionBox suggestion={detail.ai_suggestion} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
