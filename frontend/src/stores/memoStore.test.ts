import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Note, ParseResponse, ParsedEvent } from "@/types/api";

vi.mock("@/services", () => ({
  memoApi: {
    create: vi.fn(),
    parse: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

import { useMemoStore } from "./memoStore";
import { useUiStore } from "./uiStore";
import { memoApi } from "@/services";

const sampleEvent: ParsedEvent = {
  temp_id: "evt_tmp_1",
  title: "회의",
  date: "2026-04-25",
  is_all_day: false,
  start_time: "15:00",
  end_time: null,
  type: "meeting",
  participants: [],
  location: null,
  conflict: { has_conflict: false },
};

beforeEach(() => {
  useMemoStore.setState({
    step: 1,
    status: "idle",
    content: "",
    noteId: null,
    parsedEvents: [],
    errorMessage: null,
  });
  useUiStore.setState({ toastMessage: null, toastAction: null, modal: null });
  vi.clearAllMocks();
});

describe("memoStore — setters", () => {
  it("setContent updates content", () => {
    useMemoStore.getState().setContent("hello");
    expect(useMemoStore.getState().content).toBe("hello");
  });

  it("setStep updates step", () => {
    useMemoStore.getState().setStep(2);
    expect(useMemoStore.getState().step).toBe(2);
  });
});

describe("memoStore.saveAndParse", () => {
  it("success: status idle → ready, step → 2, parsedEvents populated", async () => {
    const note: Note = {
      id: "note_001",
      content: "test",
      created_at: "2026-04-25T10:00:00+09:00",
      indexed: false,
    };
    const parsed: ParseResponse = {
      note_id: "note_001",
      events: [sampleEvent],
    };
    vi.mocked(memoApi.create).mockResolvedValue(note);
    vi.mocked(memoApi.parse).mockResolvedValue(parsed);

    useMemoStore.getState().setContent("test memo");
    await useMemoStore.getState().saveAndParse();

    const state = useMemoStore.getState();
    expect(state.status).toBe("ready");
    expect(state.step).toBe(2);
    expect(state.noteId).toBe("note_001");
    expect(state.parsedEvents).toHaveLength(1);
  });

  it("noop when content is empty/whitespace only", async () => {
    useMemoStore.getState().setContent("   ");
    await useMemoStore.getState().saveAndParse();

    expect(memoApi.create).not.toHaveBeenCalled();
    expect(useMemoStore.getState().status).toBe("idle");
  });

  it("failure: status → error, errorMessage set, toast shown", async () => {
    vi.mocked(memoApi.create).mockRejectedValue({
      error: { code: "INTERNAL_ERROR", message: "boom" },
    });

    useMemoStore.getState().setContent("anything");
    await useMemoStore.getState().saveAndParse();

    const state = useMemoStore.getState();
    expect(state.status).toBe("error");
    expect(state.errorMessage).toBe("boom");
    expect(useUiStore.getState().toastMessage).toBe("boom");
  });
});

describe("memoStore — event editing", () => {
  it("updateEventField patches the matching event by temp_id", () => {
    useMemoStore.setState({ parsedEvents: [sampleEvent] });
    useMemoStore.getState().updateEventField("evt_tmp_1", { title: "수정됨" });
    expect(useMemoStore.getState().parsedEvents[0].title).toBe("수정됨");
  });

  it("removeEvent drops the matching event by temp_id", () => {
    useMemoStore.setState({
      parsedEvents: [
        sampleEvent,
        { ...sampleEvent, temp_id: "evt_tmp_2", title: "보고서" },
      ],
    });
    useMemoStore.getState().removeEvent("evt_tmp_1");
    const left = useMemoStore.getState().parsedEvents;
    expect(left).toHaveLength(1);
    expect(left[0].temp_id).toBe("evt_tmp_2");
  });
});

describe("memoStore.reset", () => {
  it("clears step/status/noteId/parsedEvents/errorMessage", () => {
    useMemoStore.setState({
      step: 3,
      status: "ready",
      noteId: "note_001",
      parsedEvents: [sampleEvent],
      errorMessage: "old",
    });
    useMemoStore.getState().reset();
    const state = useMemoStore.getState();
    expect(state.step).toBe(1);
    expect(state.status).toBe("idle");
    expect(state.noteId).toBe(null);
    expect(state.parsedEvents).toEqual([]);
    expect(state.errorMessage).toBe(null);
  });
});
