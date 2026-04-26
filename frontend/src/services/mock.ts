import type {
  AcceptSuggestionRequest,
  ApiError,
  ApiErrorCode,
  ConflictInfo,
  CreateNoteRequest,
  CreateScheduleEventInput,
  CreateSchedulesRequest,
  CreateSchedulesResponse,
  CreateShareDocRequest,
  EventType,
  GetConflictsQuery,
  GetSchedulesQuery,
  GetShareBoxQuery,
  GetShareBoxResponse,
  Note,
  ParsedEvent,
  ParseResponse,
  Schedule,
  ScheduleDetail,
  ShareDoc,
  ShareDocDetail,
  Suggestion,
  SuggestionType,
} from "@/types/api";
import { mockSchedules } from "@/data/mockSchedules";
import { mockShareBox } from "@/data/mockShareBox";
import { parseScenarios } from "@/data/mockParseResults";
import { addMinutesToTime } from "@/utils/date";

// =============================================================================
// 인공 지연 (AI 처리 느낌)
// =============================================================================

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// =============================================================================
// In-memory stores (브라우저 새로고침 시 초기화)
// =============================================================================

const notesStore: Note[] = [];
const schedulesStore: Schedule[] = [...mockSchedules];
const docsStore: ShareDoc[] = [...mockShareBox];
const suggestionsStore = new Map<string, Suggestion>();

// =============================================================================
// 헬퍼
// =============================================================================

function nowIso(): string {
  return new Date().toISOString();
}

function makeId(prefix: string, items: Array<{ id: string }>): string {
  const max = items.reduce((acc, item) => {
    const match = /_(\d+)$/.exec(item.id);
    if (!match) return acc;
    return Math.max(acc, Number(match[1]));
  }, 0);
  return `${prefix}_${String(max + 1).padStart(3, "0")}`;
}

function throwApiError(
  code: ApiErrorCode,
  message: string,
  detail?: Record<string, unknown>,
): never {
  const error: ApiError = {
    error: { code, message, ...(detail ? { detail } : {}) },
  };
  throw error;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function findConflict(
  date: string,
  startTime: string,
  endTime: string,
  ignoreScheduleId?: string,
): ConflictInfo {
  const reqStart = timeToMinutes(startTime);
  const reqEnd = timeToMinutes(endTime);
  for (const schedule of schedulesStore) {
    if (schedule.id === ignoreScheduleId) continue;
    if (schedule.date !== date) continue;
    if (schedule.is_all_day || !schedule.start_time || !schedule.end_time)
      continue;
    const sStart = timeToMinutes(schedule.start_time);
    const sEnd = timeToMinutes(schedule.end_time);
    if (overlaps(reqStart, reqEnd, sStart, sEnd)) {
      return {
        has_conflict: true,
        conflicting_event: `${schedule.title} ${schedule.start_time}~${schedule.end_time}`,
        suggested_times: suggestAlternatives(date, reqEnd - reqStart, sEnd),
      };
    }
  }
  return { has_conflict: false };
}

function suggestAlternatives(
  date: string,
  durationMin: number,
  startFromMin: number,
): string[] {
  const suggestions: string[] = [];
  const dayEnd = 21 * 60;
  for (let candidate = startFromMin; candidate + durationMin <= dayEnd; candidate += 30) {
    const candidateEnd = candidate + durationMin;
    const conflict = schedulesStore.some((s) => {
      if (s.date !== date || s.is_all_day || !s.start_time || !s.end_time)
        return false;
      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);
      return overlaps(candidate, candidateEnd, sStart, sEnd);
    });
    if (!conflict) {
      const h = Math.floor(candidate / 60);
      const m = candidate % 60;
      suggestions.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
    if (suggestions.length >= 3) break;
  }
  return suggestions;
}

function pickRelatedDocs(schedule: Schedule) {
  // 단순 매칭: 제목 키워드 포함 OR 같은 type → 회의로 가정 → meeting category
  const titleWords = schedule.title.split(/\s+/).filter((w) => w.length > 1);
  const matched = docsStore
    .filter((doc) => {
      if (titleWords.some((w) => doc.title.includes(w))) return true;
      if (schedule.type === "meeting" && doc.category === "meeting") return true;
      return false;
    })
    .slice(0, 3);
  return matched.map((doc) => ({
    doc_id: doc.id,
    title: doc.title,
    preview: doc.preview,
    relevance_score: 0.7 + Math.random() * 0.3,
    created_at: doc.created_at,
  }));
}

function maybeBuildSuggestion(schedule: Schedule): Suggestion | null {
  // 회의 + 김팀장 관련일 때만 후속 미팅 제안
  if (schedule.type !== "meeting") return null;
  if (!schedule.title.includes("김팀장") && !schedule.title.includes("회의"))
    return null;

  const sugIds = Array.from(suggestionsStore.values()).map((s) => ({
    id: s.suggestion_id,
  }));
  const sug: Suggestion = {
    suggestion_id: makeId("sug", sugIds),
    type: "follow_up_meeting",
    title: "QA 킥오프 미팅",
    suggested_date: "2026-04-28",
    suggested_start_time: "10:00",
    reason: "이번 회의에서 QA 일정 조율이 논의됐어요. 후속 킥오프를 잡아두면 좋겠어요.",
    based_on_schedule_id: schedule.id,
  };
  suggestionsStore.set(sug.suggestion_id, sug);
  return sug;
}

// =============================================================================
// mockApi
// =============================================================================

export const mockApi = {
  memo: {
    list: async (): Promise<Note[]> => {
      await sleep(120);
      return [...notesStore];
    },

    create: async (req: CreateNoteRequest): Promise<Note> => {
      await sleep(200);
      const content = req.content.trim();
      if (!content) {
        throwApiError("INVALID_REQUEST", "메모 내용은 필수예요", {
          field: "content",
        });
      }
      if (content.length > 2000) {
        throwApiError("INVALID_REQUEST", "메모는 2000자를 넘을 수 없어요", {
          field: "content",
          length: content.length,
        });
      }
      const note: Note = {
        id: makeId("note", notesStore),
        content,
        created_at: nowIso(),
        indexed: false,
      };
      notesStore.push(note);
      return note;
    },

    delete: async (noteId: string): Promise<{ ok: boolean }> => {
      await sleep(100);
      const index = notesStore.findIndex((n) => n.id === noteId);
      if (index === -1) {
        throwApiError("NOT_FOUND", "Note not found", { note_id: noteId });
      }
      notesStore.splice(index, 1);
      return { ok: true };
    },

    parse: async (noteId: string): Promise<ParseResponse> => {
      await sleep(800); // AI 처리 느낌
      const note = notesStore.find((n) => n.id === noteId);
      if (!note) {
        throwApiError("NOT_FOUND", "Note not found", { note_id: noteId });
      }
      const matched = parseScenarios.find((scenario) =>
        note.content.includes(scenario.trigger),
      );
      const events: ParsedEvent[] = matched ? matched.events : [];
      return { note_id: noteId, events };
    },
  },

  schedule: {
    create: async (
      req: CreateSchedulesRequest,
    ): Promise<CreateSchedulesResponse> => {
      await sleep(400);
      const created: Schedule[] = req.events.map(
        (event: CreateScheduleEventInput) => {
          const schedule: Schedule = {
            id: makeId("sch", schedulesStore),
            title: event.title,
            date: event.date,
            is_all_day: event.is_all_day,
            start_time: event.start_time,
            end_time: event.end_time,
            type: event.type,
            participants: event.participants,
            location: event.location,
            alert_minutes_before: event.alert_minutes_before,
            google_event_id: `mock_gcal_${Math.random().toString(36).slice(2, 10)}`,
            source_note_id: event.source_note_id,
            created_at: nowIso(),
          };
          schedulesStore.push(schedule);
          return schedule;
        },
      );
      return { schedules: created, failed: [] };
    },

    list: async (query: GetSchedulesQuery): Promise<Schedule[]> => {
      await sleep(150);
      return schedulesStore.filter((s) => {
        if (s.date < query.from || s.date > query.to) return false;
        if (query.type && s.type !== query.type) return false;
        return true;
      });
    },

    getDetail: async (id: string): Promise<ScheduleDetail> => {
      await sleep(300);
      const schedule = schedulesStore.find((s) => s.id === id);
      if (!schedule) {
        throwApiError("NOT_FOUND", "Schedule not found", { schedule_id: id });
      }
      return {
        ...schedule,
        related_docs: pickRelatedDocs(schedule),
        ai_suggestion: maybeBuildSuggestion(schedule),
      };
    },
  },

  calendar: {
    getConflicts: async (query: GetConflictsQuery): Promise<ConflictInfo> => {
      await sleep(80);
      if (!query.start_time || !query.end_time) {
        return { has_conflict: false };
      }
      return findConflict(query.date, query.start_time, query.end_time);
    },
  },

  shareBox: {
    list: async (query: GetShareBoxQuery): Promise<GetShareBoxResponse> => {
      await sleep(150);
      const limit = query.limit ?? 20;
      const offset = query.offset ?? 0;
      const q = query.q?.trim().toLowerCase();
      const filtered = docsStore.filter((doc) => {
        if (query.category && doc.category !== query.category) return false;
        if (q && !doc.title.toLowerCase().includes(q)) return false;
        return true;
      });
      return {
        items: filtered.slice(offset, offset + limit),
        total: filtered.length,
        limit,
        offset,
      };
    },

    create: async (req: CreateShareDocRequest): Promise<ShareDoc> => {
      await sleep(300);
      const title = req.title.trim();
      if (!title || title.length > 200) {
        throwApiError("INVALID_REQUEST", "제목은 1~200자여야 해요", {
          length: title.length,
        });
      }
      const fullContent = req.full_content.trim();
      if (!fullContent) {
        throwApiError("INVALID_REQUEST", "본문은 1자 이상이어야 해요", {
          field: "full_content",
        });
      }
      const preview =
        fullContent.length > 200 ? `${fullContent.slice(0, 200)}…` : fullContent;
      const doc: ShareDoc = {
        id: makeId("doc", docsStore),
        title,
        category: req.category,
        author: req.author,
        preview,
        tags: req.tags,
        created_at: nowIso(),
        indexed: false,
      };
      docsStore.push(doc);
      return doc;
    },

    getDetail: async (docId: string): Promise<ShareDocDetail> => {
      await sleep(200);
      const doc = docsStore.find((d) => d.id === docId);
      if (!doc) {
        throwApiError("NOT_FOUND", "ShareDoc not found", { doc_id: docId });
      }
      return {
        ...doc,
        full_content: `${doc.preview}\n\n(목 데이터: 본문 전체)`.repeat(3),
      };
    },
  },

  suggestion: {
    accept: async (
      suggestionId: string,
      req: AcceptSuggestionRequest,
    ): Promise<Schedule> => {
      await sleep(250);
      const sug = suggestionsStore.get(suggestionId);
      if (!sug) {
        throwApiError(
          "NOT_FOUND",
          "Suggestion not found or expired",
          { suggestion_id: suggestionId },
        );
      }
      const startTime = sug.suggested_start_time;
      const endTime = startTime ? addMinutesToTime(startTime, 60) : null;
      const sugTypeToEvent: Record<SuggestionType, EventType> = {
        follow_up_meeting: "meeting",
        review_session: "meeting",
        task: "other",
      };
      const schedule: Schedule = {
        id: makeId("sch", schedulesStore),
        title: sug.title,
        date: sug.suggested_date,
        is_all_day: startTime === null,
        start_time: startTime,
        end_time: endTime,
        type: sugTypeToEvent[sug.type],
        participants: [],
        location: null,
        alert_minutes_before: req.alert_minutes_before,
        google_event_id: `mock_gcal_${Math.random().toString(36).slice(2, 10)}`,
        source_note_id: null,
        created_at: nowIso(),
      };
      schedulesStore.push(schedule);
      suggestionsStore.delete(suggestionId);
      return schedule;
    },
  },
};
