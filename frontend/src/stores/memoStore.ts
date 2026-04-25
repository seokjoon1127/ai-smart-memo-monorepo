import { create } from "zustand";
import type { ParseResponse, ParsedEvent } from "@/types/api";

export type MemoStep = 1 | 2 | 3;

export interface DraftEvent extends ParsedEvent {
  participantsText: string;
  removed: boolean;
}

interface MemoState {
  step: MemoStep;
  content: string;
  noteId: string | null;
  parseResult: ParseResponse | null;
  drafts: DraftEvent[];
  setStep: (step: MemoStep) => void;
  setContent: (content: string) => void;
  setParseResult: (noteId: string, result: ParseResponse) => void;
  updateDraft: (tempId: string, patch: Partial<DraftEvent>) => void;
  removeDraft: (tempId: string) => void;
  reset: () => void;
}

function buildDrafts(events: ParsedEvent[]): DraftEvent[] {
  return events.map((event) => ({
    ...event,
    participantsText: event.participants.join(", "),
    removed: false,
  }));
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
