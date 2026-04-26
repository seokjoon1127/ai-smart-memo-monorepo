import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DemoHeader } from "@/components/shell/DemoHeader";
import { CalendarGrid } from "@/components/calendar/CalendarGrid";
import { ScheduleDetailModal } from "@/components/calendar/ScheduleDetailModal";
import { useScheduleStore } from "@/stores/scheduleStore";

const MIN_YEAR_MONTH = { year: 2026, month: 4 };
const MAX_YEAR_MONTH = { year: 2026, month: 5 };

function clampMonth(year: number, month: number) {
  const value = year * 12 + (month - 1);
  const min = MIN_YEAR_MONTH.year * 12 + (MIN_YEAR_MONTH.month - 1);
  const max = MAX_YEAR_MONTH.year * 12 + (MAX_YEAR_MONTH.month - 1);
  const clamped = Math.min(Math.max(value, min), max);
  return { year: Math.floor(clamped / 12), month: (clamped % 12) + 1 };
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

function monthRange(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${pad2(month)}-01`,
    to: `${year}-${pad2(month)}-${pad2(lastDay)}`,
  };
}

export function CalendarPage() {
  const navigate = useNavigate();
  const calendarEvents = useScheduleStore((s) => s.calendarEvents);
  const fetchCalendarEvents = useScheduleStore((s) => s.fetchCalendarEvents);

  const today = useMemo(() => new Date(), []);
  const [{ year, month }, setYearMonth] = useState(() =>
    clampMonth(today.getFullYear(), today.getMonth() + 1),
  );
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null,
  );

  const { from, to } = useMemo(() => monthRange(year, month), [year, month]);

  useEffect(() => {
    void fetchCalendarEvents(from, to);
  }, [fetchCalendarEvents, from, to]);

  const isMin =
    year === MIN_YEAR_MONTH.year && month === MIN_YEAR_MONTH.month;
  const isMax =
    year === MAX_YEAR_MONTH.year && month === MAX_YEAR_MONTH.month;

  const goPrev = () => {
    if (isMin) return;
    setYearMonth(clampMonth(year, month - 1));
  };
  const goNext = () => {
    if (isMax) return;
    setYearMonth(clampMonth(year, month + 1));
  };
  const goToday = () =>
    setYearMonth(clampMonth(today.getFullYear(), today.getMonth() + 1));

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
            <button
              type="button"
              onClick={goPrev}
              disabled={isMin}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              aria-label="이전 달"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-2xl font-bold">
              {year}년 {month}월
            </h2>
            <button
              type="button"
              onClick={goNext}
              disabled={isMax}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-toss-gray-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
              aria-label="다음 달"
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
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={goToday}
              className="ml-2 px-3 py-1.5 bg-white border border-toss-gray-200 text-toss-gray-700 rounded-lg text-xs font-medium hover:bg-toss-gray-50"
            >
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
              <span className="text-toss-gray-600">이벤트</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-toss-warning rounded-sm" />
              <span className="text-toss-gray-600">마감</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-toss-success rounded-sm" />
              <span className="text-toss-gray-600">기타</span>
            </div>
          </div>
        </div>

        <CalendarGrid
          year={year}
          month={month}
          events={calendarEvents}
          today={today}
          onEventClick={setSelectedScheduleId}
        />
      </div>

      {selectedScheduleId && (
        <ScheduleDetailModal
          scheduleId={selectedScheduleId}
          onClose={() => setSelectedScheduleId(null)}
        />
      )}
    </div>
  );
}
