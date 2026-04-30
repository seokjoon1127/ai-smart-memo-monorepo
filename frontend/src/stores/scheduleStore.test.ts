import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Schedule, ScheduleDetail } from "@/types/api";

vi.mock("@/services", () => ({
  scheduleApi: {
    create: vi.fn(),
    list: vi.fn(),
    getDetail: vi.fn(),
  },
  calendarApi: {
    createGoogleEvent: vi.fn(),
  },
  suggestionApi: {
    accept: vi.fn(),
  },
}));

import { useScheduleStore } from "./scheduleStore";
import { useUiStore } from "./uiStore";
import { calendarApi, scheduleApi, suggestionApi } from "@/services";

const sampleSchedule: Schedule = {
  id: "sch_100",
  title: "데모",
  date: "2026-04-25",
  is_all_day: false,
  start_time: "10:00",
  end_time: "11:00",
  type: "meeting",
  participants: [],
  location: null,
  alert_minutes_before: 10,
  google_event_id: "g_x",
  source_note_id: null,
  created_at: "2026-04-25T08:00:00+09:00",
};

beforeEach(() => {
  useScheduleStore.getState().reset();
  useUiStore.setState({ toastMessage: null, toastAction: null, modal: null });
  vi.clearAllMocks();
});

describe("scheduleStore.createSchedules", () => {
  it("success: schedules + calendarEvents 갱신, status idle 복귀", async () => {
    vi.mocked(scheduleApi.create).mockResolvedValue({
      schedules: [sampleSchedule],
      failed: [],
    });

    const result = await useScheduleStore.getState().createSchedules([
      {
        title: "데모",
        date: "2026-04-25",
        is_all_day: false,
        start_time: "10:00",
        end_time: "11:00",
        type: "meeting",
        participants: [],
        location: null,
        alert_minutes_before: 10,
        source_note_id: null,
      },
    ]);

    expect(result).toHaveLength(1);
    const state = useScheduleStore.getState();
    expect(state.schedules).toHaveLength(1);
    expect(state.calendarEvents).toHaveLength(1);
    expect(state.status).toBe("idle");
  });

  it("failure: returns null, status → error, toast 노출", async () => {
    vi.mocked(scheduleApi.create).mockRejectedValue({
      error: { code: "INTERNAL_ERROR", message: "캘린더 동기화 실패" },
    });

    const result = await useScheduleStore.getState().createSchedules([]);
    expect(result).toBe(null);
    expect(useScheduleStore.getState().status).toBe("error");
    expect(useUiStore.getState().toastMessage).toBe("캘린더 동기화 실패");
  });

  it("failed[]가 비어있지 않으면 추가로 토스트 노출", async () => {
    vi.mocked(scheduleApi.create).mockResolvedValue({
      schedules: [sampleSchedule],
      failed: [{ schedule_id: "sch_999", reason: "Google 동기화 실패" }],
    });

    await useScheduleStore.getState().createSchedules([]);
    expect(useUiStore.getState().toastMessage).toContain("실패");
  });
});

describe("scheduleStore.fetchScheduleDetail", () => {
  const detail: ScheduleDetail = {
    ...sampleSchedule,
    related_docs: [],
    ai_suggestion: null,
  };

  it("성공: scheduleDetails 캐시에 저장", async () => {
    vi.mocked(scheduleApi.getDetail).mockResolvedValue(detail);
    await useScheduleStore.getState().fetchScheduleDetail("sch_100");
    expect(useScheduleStore.getState().scheduleDetails["sch_100"]).toEqual(
      detail,
    );
  });

  it("이미 캐시된 id는 재호출하지 않음", async () => {
    useScheduleStore.setState({
      scheduleDetails: { sch_100: detail },
    });
    await useScheduleStore.getState().fetchScheduleDetail("sch_100");
    expect(scheduleApi.getDetail).not.toHaveBeenCalled();
  });
});

describe("scheduleStore.fetchCalendarEvents", () => {
  it("성공: calendarEvents 채움, status idle", async () => {
    vi.mocked(scheduleApi.list).mockResolvedValue([sampleSchedule]);
    await useScheduleStore
      .getState()
      .fetchCalendarEvents("2026-04-01", "2026-04-30");
    const state = useScheduleStore.getState();
    expect(state.calendarEvents).toHaveLength(1);
    expect(state.status).toBe("idle");
  });
});

describe("scheduleStore.syncGoogleCalendar", () => {
  it("성공: schedule의 google_event_id를 갱신함", async () => {
    const unsyncedSchedule = { ...sampleSchedule, google_event_id: null };
    const syncedSchedule = {
      ...sampleSchedule,
      google_event_id: "google_event_1",
    };
    useScheduleStore.setState({
      schedules: [unsyncedSchedule],
      calendarEvents: [unsyncedSchedule],
    });
    vi.mocked(calendarApi.createGoogleEvent).mockResolvedValue({
      schedule: syncedSchedule,
      google_event_id: "google_event_1",
      html_link: "https://calendar.google.com/calendar/event?eid=1",
    });

    const result = await useScheduleStore
      .getState()
      .syncGoogleCalendar("sch_100");

    expect(result?.google_event_id).toBe("google_event_1");
    expect(useScheduleStore.getState().schedules[0].google_event_id).toBe(
      "google_event_1",
    );
    expect(useScheduleStore.getState().calendarEvents[0].google_event_id).toBe(
      "google_event_1",
    );
  });

  it("실패: null 반환, 토스트 노출", async () => {
    vi.mocked(calendarApi.createGoogleEvent).mockRejectedValue({
      error: { code: "INVALID_REQUEST", message: "Google 권한이 필요해요" },
    });

    const result = await useScheduleStore
      .getState()
      .syncGoogleCalendar("sch_404");

    expect(result).toBe(null);
    expect(useUiStore.getState().toastMessage).toBe("Google 권한이 필요해요");
  });
});

describe("scheduleStore.acceptSuggestion", () => {
  it("성공: 새 일정이 calendarEvents에 추가됨", async () => {
    vi.mocked(suggestionApi.accept).mockResolvedValue(sampleSchedule);
    const result = await useScheduleStore
      .getState()
      .acceptSuggestion("sug_001");
    expect(result).toEqual(sampleSchedule);
    expect(useScheduleStore.getState().calendarEvents).toContain(
      sampleSchedule,
    );
  });

  it("실패: null 반환, 토스트 노출", async () => {
    vi.mocked(suggestionApi.accept).mockRejectedValue({
      error: { code: "NOT_FOUND", message: "이미 수락한 제안이에요" },
    });
    const result = await useScheduleStore
      .getState()
      .acceptSuggestion("sug_999");
    expect(result).toBe(null);
    expect(useUiStore.getState().toastMessage).toBe(
      "이미 수락한 제안이에요",
    );
  });
});
