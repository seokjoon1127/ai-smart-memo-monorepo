import { create } from "zustand";
import type { ParseResult, ParsedEvent } from "@/types/api";

export type MemoStep = 1 | 2 | 3;

export interface DraftEvent extends ParsedEvent {
  isAllDay: boolean;
  endTime: string | null;
  location: string;
  participantsText: string;
  removed: boolean;
}

interface MemoState {
  step: MemoStep;
  content: string;
  noteId: string | null;
  parseResult: ParseResult | null;
  drafts: DraftEvent[];
  setStep: (step: MemoStep) => void;
  setContent: (content: string) => void;
  setParseResult: (noteId: string, result: ParseResult) => void;
  updateDraft: (tempId: string, patch: Partial<DraftEvent>) => void;
  removeDraft: (tempId: string) => void;
  reset: () => void;
}

function buildDrafts(events: ParsedEvent[]): DraftEvent[] {
  return events.map((event) => {
    const isAllDay = !event.time || !event.duration_min;
    const endTime =
      event.time && event.duration_min
        ? addMinutes(event.time, event.duration_min)
        : null;
    return {
      ...event,
      isAllDay,
      endTime,
      location: "",
      participantsText: event.participants.join(", "),
      removed: false,
    };
  });
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const eh = Math.floor(total / 60) % 24;
  const em = total % 60;
  return `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`;
}

export const useMemoStore = create<MemoState>((set) => ({
  step: 1,
  content: "내일 3시 김팀장 회의, 금요일까지 보고서 제출",
  noteId: null,
  parseResult: null,
  drafts: [],
  setStep: (step) => set({ step }),
  setContent: (content) => set({ content }),
  setParseResult: (noteId, result) =>
    set({
      noteId,
      parseResult: result,
      drafts: buildDrafts(result.events),
      step: 2,
    }),
  updateDraft: (tempId, patch) =>
    set((state) => ({
      drafts: state.drafts.map((draft) =>
        draft.temp_id === tempId ? { ...draft, ...patch } : draft,
      ),
    })),
  removeDraft: (tempId) =>
    set((state) => ({
      drafts: state.drafts.map((draft) =>
        draft.temp_id === tempId ? { ...draft, removed: true } : draft,
      ),
    })),
  reset: () =>
    set({
      step: 1,
      noteId: null,
      parseResult: null,
      drafts: [],
    }),
}));
