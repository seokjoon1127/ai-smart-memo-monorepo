import { useEffect, useState } from "react";
import { CalendarPlus, Check, Loader2, Trash2 } from "lucide-react";
import { useScheduleStore } from "@/stores/scheduleStore";
import { useUiStore } from "@/stores/uiStore";
import { useAuth } from "@/contexts/AuthContext";
import type { EventType, Schedule } from "@/types/api";
import { formatDateKo, formatTimeKo } from "@/utils/date";
import { RelatedDocCard } from "./RelatedDocCard";
import { SuggestionBox } from "./SuggestionBox";

interface Props {
  schedule: Schedule;
}

const typeBadge: Record<EventType, { label: string; className: string }> = {
  meeting: {
    label: "회의",
    className: "bg-toss-blue-light text-toss-blue",
  },
  deadline: {
    label: "마감",
    className: "bg-toss-warning-bg text-toss-warning",
  },
  event: {
    label: "이벤트",
    className: "bg-toss-purple-bg text-toss-purple",
  },
  other: {
    label: "기타",
    className: "bg-toss-gray-50 text-toss-gray-600",
  },
};

export function ScheduleResultCard({ schedule }: Props) {
  const [isSyncingGoogle, setIsSyncingGoogle] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { user, isGuest } = useAuth();
  const showToast = useUiStore((s) => s.showToast);
  const detail = useScheduleStore(
    (s) => s.scheduleDetails[schedule.id],
  );
  const fetchScheduleDetail = useScheduleStore((s) => s.fetchScheduleDetail);
  const syncGoogleCalendar = useScheduleStore((s) => s.syncGoogleCalendar);
  const deleteSchedule = useScheduleStore((s) => s.deleteSchedule);

  useEffect(() => {
    void fetchScheduleDetail(schedule.id);
  }, [schedule.id, fetchScheduleDetail]);

  const badge = typeBadge[schedule.type];
  const timeText = schedule.is_all_day
    ? "종일"
    : formatTimeKo(schedule.start_time);
  const isSyncedToGoogle =
    schedule.google_event_id !== null &&
    !schedule.google_event_id.startsWith("mock_");

  const handleGoogleCalendarClick = async () => {
    if (isSyncedToGoogle || isSyncingGoogle) return;

    if (!user || isGuest) {
      showToast("Google Calendar 연동은 Google 로그인 후 사용할 수 있어요");
      return;
    }

    setIsSyncingGoogle(true);
    const result = await syncGoogleCalendar(schedule.id);
    setIsSyncingGoogle(false);

    if (!result) return;

    showToast(
      "Google Calendar에 추가했어요",
      result.html_link
        ? {
            label: "열기",
            onClick: () => {
              window.open(result.html_link ?? "", "_blank", "noopener,noreferrer");
            },
          }
        : undefined,
    );
  };

  const handleDeleteClick = async () => {
    if (!schedule.can_delete || isDeleting) return;

    setIsDeleting(true);
    const deleted = await deleteSchedule(schedule.id);
    setIsDeleting(false);

    if (deleted) {
      showToast("일정을 삭제했어요");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 mb-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs px-2 py-0.5 rounded font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
          </div>
          <h3 className="text-xl font-bold mb-1">{schedule.title}</h3>
          <p className="text-sm text-toss-gray-500">
            {formatDateKo(schedule.date)} · {timeText}
          </p>
        </div>
        {schedule.can_delete && (
          <button
            type="button"
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="flex h-8 items-center gap-1.5 rounded-lg bg-toss-gray-50 px-3 text-xs font-medium text-toss-gray-700 hover:bg-toss-gray-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            삭제
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={handleGoogleCalendarClick}
        disabled={isSyncedToGoogle || isSyncingGoogle}
        className={`mb-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium ${
          isSyncedToGoogle
            ? "border-toss-success-bg bg-toss-success-bg text-toss-success"
            : "border-toss-gray-200 bg-white text-toss-gray-700 hover:bg-toss-gray-50"
        } disabled:cursor-not-allowed disabled:opacity-80`}
      >
        {isSyncingGoogle ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isSyncedToGoogle ? (
          <Check className="h-4 w-4" />
        ) : (
          <CalendarPlus className="h-4 w-4" />
        )}
        <span>
          {isSyncingGoogle
            ? "Google Calendar에 추가 중..."
            : isSyncedToGoogle
              ? "Google Calendar 추가 완료"
              : "Google Calendar에도 추가"}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-toss-gray-25 rounded-lg p-3">
          <p className="text-xs text-toss-gray-500 mb-1">참석자</p>
          <p
            className={`text-sm font-medium ${
              schedule.participants.length === 0 ? "text-toss-gray-300" : ""
            }`}
          >
            {schedule.participants.length === 0
              ? "미설정"
              : schedule.participants.join(", ")}
          </p>
        </div>
        <div className="bg-toss-gray-25 rounded-lg p-3">
          <p className="text-xs text-toss-gray-500 mb-1">알림</p>
          <p className="text-sm font-medium">
            {schedule.alert_minutes_before >= 1440
              ? `${Math.round(schedule.alert_minutes_before / 1440)}일 전`
              : `${schedule.alert_minutes_before}분 전`}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium">
            📎 연관 문서{" "}
            <span className="text-xs text-toss-gray-400 font-normal ml-1">
              from ShareBox
            </span>
          </p>
        </div>

        {!detail && (
          <div className="bg-toss-gray-25 rounded-lg p-3 text-xs text-toss-gray-400">
            연관 문서 불러오는 중...
          </div>
        )}

        {detail && detail.related_docs.length === 0 && (
          <div className="bg-toss-gray-25 rounded-lg p-3 text-xs text-toss-gray-400">
            연관 문서가 없어요.
          </div>
        )}

        {detail?.related_docs.map((doc) => (
          <RelatedDocCard key={doc.doc_id} doc={doc} />
        ))}
      </div>

      {detail?.ai_suggestion && (
        <SuggestionBox suggestion={detail.ai_suggestion} />
      )}
    </div>
  );
}
