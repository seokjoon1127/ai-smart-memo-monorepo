import { create } from "zustand";
import type { Schedule } from "@/types/api";

interface ScheduleState {
  recentlyCreated: Schedule[];
  setRecentlyCreated: (schedules: Schedule[]) => void;
  appendCreated: (schedules: Schedule[]) => void;
  clear: () => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  recentlyCreated: [],
  setRecentlyCreated: (schedules) => set({ recentlyCreated: schedules }),
  appendCreated: (schedules) =>
    set((state) => ({
      recentlyCreated: [...state.recentlyCreated, ...schedules],
    })),
  clear: () => set({ recentlyCreated: [] }),
}));
