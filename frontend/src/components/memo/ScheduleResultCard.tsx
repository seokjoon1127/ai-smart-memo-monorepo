import { useQuery } from "@tanstack/react-query";
import type { EventType, Schedule } from "@/types/api";
import { getScheduleDetail } from "@/services/scheduleApi";
import { formatDateKo, formatTimeKo } from "@/utils/date";
import { RelatedDocCard } from "./RelatedDocCard";
import { SuggestionBox } from "./SuggestionBox";

interface Props {
  schedule: Schedule;
  suggestion?: {
    title: string;
    isoDate: string;
    category: string;
    categoryClass: string;
    description: string;
  };
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

export function ScheduleResultCard({ schedule, suggestion }: Props) {
  const detailQuery = useQuery({
    queryKey: ["schedule", schedule.id],
    queryFn: () => getScheduleDetail(schedule.id),
    staleTime: 60_000,
  });

  const detail = detailQuery.data;
  const badge = typeBadge[schedule.type];

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
            {formatDateKo(schedule.date)} · {formatTimeKo(schedule.time)}
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
          <p className="text-sm font-medium text-toss-gray-300">미설정</p>
        </div>
        <div className="bg-toss-gray-25 rounded-lg p-3">
          <p className="text-xs text-toss-gray-500 mb-1">알림</p>
          <p className="text-sm font-medium">
            {schedule.type === "deadline" ? "1일 전" : "10분 전"}
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

        {detailQuery.isLoading && (
          <div className="bg-toss-gray-25 rounded-lg p-3 text-xs text-toss-gray-400">
            연관 문서 불러오는 중...
          </div>
        )}

        {detail && detail.related_notes.length === 0 && (
          <div className="bg-toss-gray-25 rounded-lg p-3 text-xs text-toss-gray-400">
            연관 문서가 없어요.
          </div>
        )}

        {detail?.related_notes.map((note) => (
          <RelatedDocCard key={note.note_id} note={note} />
        ))}

        {detail?.rag_summary && (
          <div className="mt-2 bg-toss-purple-bg rounded-lg p-3">
            <p className="text-[11px] text-toss-purple font-medium mb-1">
              ✨ RAG 요약
            </p>
            <p className="text-xs text-toss-gray-700 leading-relaxed">
              {detail.rag_summary.summary}
            </p>
          </div>
        )}
      </div>

      {suggestion && <SuggestionBox suggestion={suggestion} />}
    </div>
  );
}
