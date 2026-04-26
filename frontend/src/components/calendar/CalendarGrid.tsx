import type { EventType, Schedule } from "@/types/api";

const pillClassByType: Record<EventType, string> = {
  meeting: "bg-toss-blue-light text-[#1B64DA]",
  deadline: "bg-toss-warning-bg text-[#C2410C]",
  event: "bg-toss-purple-bg text-[#6D28D9]",
  other: "bg-toss-success-bg text-[#137333]",
};

interface Props {
  year: number;
  month: number;
  events: Schedule[];
  today?: Date;
  onEventClick?: (scheduleId: string) => void;
}

function dayOf(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}

function groupByDay(events: Schedule[]): Record<number, Schedule[]> {
  const map: Record<number, Schedule[]> = {};
  for (const event of events) {
    const day = dayOf(event.date);
    if (Number.isNaN(day)) continue;
    if (!map[day]) map[day] = [];
    map[day].push(event);
  }
  return map;
}

interface Cell {
  day: number;
  isOtherMonth: boolean;
  isToday: boolean;
  weekday: number;
  events: Schedule[];
}

function buildCells(
  year: number,
  month: number,
  byDay: Record<number, Schedule[]>,
  todayDayInMonth: number | null,
): Cell[] {
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  const cells: Cell[] = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({
      day: prevMonthDays - firstWeekday + 1 + i,
      isOtherMonth: true,
      isToday: false,
      weekday: i,
      events: [],
    });
  }

  for (let d = 1; d <= daysInMonth; d += 1) {
    const weekday = (firstWeekday + d - 1) % 7;
    cells.push({
      day: d,
      isOtherMonth: false,
      isToday: d === todayDayInMonth,
      weekday,
      events: byDay[d] ?? [],
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

export function CalendarGrid({
  year,
  month,
  events,
  today,
  onEventClick,
}: Props) {
  const now = today ?? new Date();
  const todayDayInMonth =
    now.getFullYear() === year && now.getMonth() + 1 === month
      ? now.getDate()
      : null;

  const byDay = groupByDay(events);
  const cells = buildCells(year, month, byDay, todayDayInMonth);

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
              {cell.events.slice(0, 3).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event.id);
                  }}
                  className={`block w-full text-left text-[11px] px-1.5 py-0.5 rounded mt-1 truncate hover:brightness-95 transition ${pillClassByType[event.type]}`}
                  title={event.title}
                >
                  {event.title}
                </button>
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
