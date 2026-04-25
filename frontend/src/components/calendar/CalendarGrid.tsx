import {
  mockCalendarEvents,
  pillClass,
  type CalendarPill,
} from "@/data/mockEvents";

const FIRST_WEEKDAY = 3;
const DAYS_IN_MONTH = 30;
const TODAY = 25;
const PREV_DAYS = [29, 30, 31];

function buildCells(): {
  day: number;
  isOtherMonth: boolean;
  isToday: boolean;
  weekday: number;
  events: CalendarPill[];
}[] {
  const cells: ReturnType<typeof buildCells> = [];
  for (let i = 0; i < FIRST_WEEKDAY; i += 1) {
    cells.push({
      day: PREV_DAYS[i],
      isOtherMonth: true,
      isToday: false,
      weekday: i,
      events: [],
    });
  }
  for (let d = 1; d <= DAYS_IN_MONTH; d += 1) {
    const weekday = (FIRST_WEEKDAY + d - 1) % 7;
    cells.push({
      day: d,
      isOtherMonth: false,
      isToday: d === TODAY,
      weekday,
      events: mockCalendarEvents[d] ?? [],
    });
  }
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i += 1) {
    cells.push({
      day: i,
      isOtherMonth: true,
      isToday: false,
      weekday: (cells.length + i - 1) % 7,
      events: [],
    });
  }
  return cells;
}

const cellBase =
  "bg-white min-h-[110px] p-2 cursor-pointer transition hover:bg-toss-gray-25";

export function CalendarGrid() {
  const cells = buildCells();
  return (
    <>
      <div className="grid grid-cols-7 gap-px mb-1 bg-white rounded-t-xl overflow-hidden">
        {[
          { label: "일", className: "text-red-500" },
          { label: "월" },
          { label: "화" },
          { label: "수" },
          { label: "목" },
          { label: "금" },
          { label: "토", className: "text-blue-500" },
        ].map(({ label, className }) => (
          <div
            key={label}
            className={`px-3 py-2 text-center text-xs font-medium bg-toss-gray-25 ${
              className ?? "text-toss-gray-600"
            }`}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-toss-gray-100 border border-toss-gray-100 rounded-b-xl overflow-hidden">
        {cells.map((cell, index) => {
          const dayColor =
            !cell.isToday && !cell.isOtherMonth
              ? cell.weekday === 0
                ? "text-red-500"
                : cell.weekday === 6
                  ? "text-blue-500"
                  : ""
              : cell.isOtherMonth
                ? "text-toss-gray-300"
                : "";
          return (
            <div
              key={index}
              className={`${cellBase} ${cell.isOtherMonth ? "bg-[#FAFBFC]" : ""}`}
            >
              {cell.isToday ? (
                <span className="bg-toss-blue text-white rounded-full font-semibold inline-flex items-center justify-center w-6 h-6 text-sm">
                  {cell.day}
                </span>
              ) : (
                <span className={`text-sm ${dayColor}`}>{cell.day}</span>
              )}
              {cell.events.slice(0, 3).map((event, i) => (
                <div
                  key={i}
                  className={`text-[11px] px-1.5 py-0.5 rounded mt-1 truncate ${pillClass[event.type]}`}
                >
                  {event.title}
                </div>
              ))}
              {cell.events.length > 3 && (
                <div className="text-[10px] text-toss-gray-400 mt-0.5">
                  +{cell.events.length - 3}개
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
