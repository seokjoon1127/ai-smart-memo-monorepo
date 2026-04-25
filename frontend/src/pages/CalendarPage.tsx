import { useNavigate } from "react-router-dom";
import { DemoHeader } from "@/components/shell/DemoHeader";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";

export function CalendarPage() {
  const navigate = useNavigate();
  return (
    <div>
      <DemoHeader
        title="일정 관리"
        subtitle="팀의 모든 일정을 한 곳에서 확인하세요"
        right={
          <div className="flex items-center gap-2">
            <div className="flex bg-toss-gray-50 rounded-lg p-1">
              <button className="px-3 py-1.5 bg-white text-toss-gray-900 rounded-md text-xs font-medium shadow-sm">
                월간
              </button>
              <button className="px-3 py-1.5 text-toss-gray-500 rounded-md text-xs font-medium">
                주간
              </button>
              <button className="px-3 py-1.5 text-toss-gray-500 rounded-md text-xs font-medium">
                일간
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate("/memo")}
              className="px-4 py-2 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-lg text-sm font-medium"
            >
              + 일정 추가
            </button>
          </div>
        }
      />

      <div className="px-10 py-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-100">
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-2xl font-bold">2026년 4월</h2>
            <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-100">
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button className="ml-2 px-3 py-1.5 bg-white border border-toss-gray-200 text-toss-gray-700 rounded-lg text-xs font-medium hover:bg-toss-gray-50">
              오늘
            </button>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-toss-blue rounded-sm" />
              <span className="text-toss-gray-600">회의</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-toss-purple rounded-sm" />
              <span className="text-toss-gray-600">프로젝트</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-toss-warning rounded-sm" />
              <span className="text-toss-gray-600">마감</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-toss-success rounded-sm" />
              <span className="text-toss-gray-600">개인</span>
            </div>
          </div>
        </div>

        <CalendarGrid />
      </div>
    </div>
  );
}
