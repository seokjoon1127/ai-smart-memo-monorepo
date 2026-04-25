import { create } from "zustand";
import { isApiError, type ParsedEvent } from "@/types/api";
import { memoApi } from "@/services";
import { useUiStore } from "./uiStore";

export type MemoStep = 1 | 2 | 3;
export type MemoStatus = "idle" | "parsing" | "ready" | "error";

interface MemoState {
  step: MemoStep;
  status: MemoStatus;
  content: string;
  noteId: string | null;
  parsedEvents: ParsedEvent[];
  errorMessage: string | null;
  setStep: (step: MemoStep) => void;
  setContent: (content: string) => void;
  saveAndParse: () => Promise<void>;
  updateEventField: (tempId: string, patch: Partial<ParsedEvent>) => void;
  removeEvent: (tempId: string) => void;
  reset: () => void;
}

const DEFAULT_CONTENT = "내일 3시 김팀장 회의, 금요일까지 보고서 제출";

export const useMemoStore = create<MemoState>((set, get) => ({
  step: 1,
  status: "idle",
  content: DEFAULT_CONTENT,
  noteId: null,
  parsedEvents: [],
  errorMessage: null,

  setStep: (step) => set({ step }),
  setContent: (content) => set({ content }),

  saveAndParse: async () => {
    const content = get().content.trim();
    if (!content) return;
    set({ status: "parsing", errorMessage: null });
    try {
      const note = await memoApi.create({ content });
      const result = await memoApi.parse(note.id);
      set({
        noteId: note.id,
        parsedEvents: result.events,
        status: "ready",
        step: 2,
      });
    } catch (error) {
      const message = isApiError(error)
        ? error.error.message
        : "파싱에 실패했어요";
      set({ status: "error", errorMessage: message });
      useUiStore.getState().showToast(message);
    }
  },

  updateEventField: (tempId, patch) =>
    set((state) => ({
      parsedEvents: state.parsedEvents.map((event) =>
        event.temp_id === tempId ? { ...event, ...patch } : event,
      ),
    })),

  removeEvent: (tempId) =>
    set((state) => ({
      parsedEvents: state.parsedEvents.filter(
        (event) => event.temp_id !== tempId,
      ),
    })),

  reset: () =>
    set({
      step: 1,
      status: "idle",
      noteId: null,
      parsedEvents: [],
      errorMessage: null,
    }),
}));
