import { create } from "zustand";
import {
  isApiError,
  type DocCategory,
  type ShareDoc,
} from "@/types/api";
import { shareBoxApi } from "@/services";

export type ShareBoxStatus = "idle" | "fetching" | "error";

interface ShareBoxState {
  items: ShareDoc[];
  total: number;
  query: string;
  category: DocCategory | "all";
  status: ShareBoxStatus;
  errorMessage: string | null;
  setQuery: (query: string) => void;
  setCategory: (category: DocCategory | "all") => void;
  fetch: () => Promise<void>;
  reset: () => void;
}

export const useShareBoxStore = create<ShareBoxState>((set, get) => ({
  items: [],
  total: 0,
  query: "",
  category: "all",
  status: "idle",
  errorMessage: null,

  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),

  fetch: async () => {
    const { query, category } = get();
    set({ status: "fetching", errorMessage: null });
    try {
      const response = await shareBoxApi.list({
        q: query.trim() || undefined,
        category: category === "all" ? undefined : category,
      });
      set({ items: response.items, total: response.total, status: "idle" });
    } catch (error) {
      const message = isApiError(error)
        ? error.error.message
        : "문서 목록을 불러오지 못했어요";
      set({ status: "error", errorMessage: message });
    }
  },

  reset: () =>
    set({
      items: [],
      total: 0,
      query: "",
      category: "all",
      status: "idle",
      errorMessage: null,
    }),
}));
