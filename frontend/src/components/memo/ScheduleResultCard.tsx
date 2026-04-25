import { useEffect } from "react";
import { useScheduleStore } from "@/stores/scheduleStore";
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
  const detail = useScheduleStore(
    (s) => s.scheduleDetails[schedule.id],
  );
  const fetchScheduleDetail = useScheduleStore((s) => s.fetchScheduleDetail);

  useEffect(() => {
    void fetchScheduleDetail(schedule.id);
  }, [schedule.id, fetchScheduleDetail]);

  const badge = typeBadge[schedule.type];
  const timeText = schedule.is_all_day
    ? "종일"
    : formatTimeKo(schedule.start_time);

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
        <button
          type="button"
          className="text-xs px-3 py-1.5 bg-toss-gray-50 hover:bg-toss-gray-100 text-toss-gray-700 rounded-lg font-medium"
        >
          수정
        </button>
      </div>

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
