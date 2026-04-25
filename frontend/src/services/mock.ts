import type {
  ApprovedEvent,
  Note,
  ParseResult,
  Schedule,
  ScheduleDetail,
} from "@/types/api";

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

let noteCounter = 0;

export async function mockCreateNote(content: string): Promise<Note> {
  await delay(200);
  noteCounter += 1;
  return {
    id: `note_${String(noteCounter).padStart(3, "0")}`,
    user_id: "demo-user",
    content,
    created_at: new Date().toISOString(),
  };
}

export async function mockParseNote(noteId: string): Promise<ParseResult> {
  await delay(800);
  return {
    note_id: noteId,
    events: [
      {
        temp_id: "evt_tmp_1",
        title: "김팀장 회의",
        date: "2026-04-23",
        time: "15:00",
        duration_min: 60,
        type: "meeting",
        participants: ["김팀장"],
        conflict: {
          has_conflict: true,
          conflicting_event: "팀 스탠드업 15:00~15:30",
          suggested_times: ["15:30", "16:00", "16:30"],
        },
      },
      {
        temp_id: "evt_tmp_2",
        title: "보고서 제출",
        date: "2026-04-25",
        time: null,
        duration_min: null,
        type: "deadline",
        participants: [],
        conflict: { has_conflict: false },
      },
    ],
  };
}

const mockSchedules: Schedule[] = [];

export async function mockCreateSchedules(
  noteId: string,
  events: ApprovedEvent[],
): Promise<Schedule[]> {
  await delay(400);
  const created = events.map((event, index) => ({
    id: `sch_${String(mockSchedules.length + index + 1).padStart(3, "0")}`,
    user_id: "demo-user",
    title: event.title,
    date: event.date,
    time: event.time,
    duration_min: event.duration_min,
    type: event.type,
    source_note_id: noteId,
    created_at: new Date().toISOString(),
  }));
  mockSchedules.push(...created);
  return created;
}

export async function mockListSchedules(): Promise<Schedule[]> {
  await delay(150);
  return mockSchedules;
}

export async function mockGetScheduleDetail(
  scheduleId: string,
): Promise<ScheduleDetail> {
  await delay(300);
  const found = mockSchedules.find((s) => s.id === scheduleId);
  if (!found) throw new Error("Schedule not found");
  return {
    ...found,
    related_notes: [
      {
        note_id: "note_001",
        content:
          "디자인 시안 피드백 완료. QA 일정 조율 시급. 다음주 월요일까지 QA 킥오프 일정 확정 필요.",
        relevance_score: 0.92,
        created_at: "2026-04-16T10:00:00+09:00",
      },
      {
        note_id: "note_002",
        content: "백엔드 API 완료, 프론트 작업 중. RAG 시스템 연동 다음 스프린트.",
        relevance_score: 0.74,
        created_at: "2026-04-10T09:00:00+09:00",
      },
    ],
    rag_summary: {
      summary:
        "최근 디자인 시안 피드백이 마무리됐고, QA 일정 조율과 RAG 연동이 다음 안건입니다.",
      source_note_ids: ["note_001", "note_002"],
      generated_at: new Date().toISOString(),
    },
  };
}
