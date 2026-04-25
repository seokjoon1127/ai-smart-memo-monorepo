export type CalendarPillType =
  | "event-blue"
  | "event-purple"
  | "event-warning"
  | "event-success";

export interface CalendarPill {
  title: string;
  type: CalendarPillType;
}

export const mockCalendarEvents: Record<number, CalendarPill[]> = {
  3: [{ title: "디자인 리뷰", type: "event-blue" }],
  7: [
    { title: "QA 프로세스 회의", type: "event-blue" },
    { title: "주간 회고", type: "event-success" },
  ],
  10: [{ title: "프로젝트A 마일스톤", type: "event-purple" }],
  14: [{ title: "팀 스탠드업", type: "event-blue" }],
  15: [
    { title: "클라이언트 미팅", type: "event-blue" },
    { title: "점심 약속", type: "event-success" },
  ],
  16: [{ title: "김팀장 주간회의", type: "event-blue" }],
  17: [{ title: "디자인 시스템 v2", type: "event-purple" }],
  20: [{ title: "월간 회의", type: "event-blue" }],
  22: [{ title: "팀 스탠드업", type: "event-blue" }],
  23: [
    { title: "김팀장 회의", type: "event-blue" },
    { title: "팀 스탠드업", type: "event-blue" },
  ],
  25: [{ title: "보고서 제출 마감", type: "event-warning" }],
  28: [{ title: "QA 킥오프 (제안)", type: "event-purple" }],
  30: [{ title: "월말 결산", type: "event-warning" }],
};

export const pillClass: Record<CalendarPillType, string> = {
  "event-blue": "bg-toss-blue-light text-[#1B64DA]",
  "event-purple": "bg-toss-purple-bg text-[#6D28D9]",
  "event-warning": "bg-toss-warning-bg text-[#C2410C]",
  "event-success": "bg-toss-success-bg text-[#137333]",
};
