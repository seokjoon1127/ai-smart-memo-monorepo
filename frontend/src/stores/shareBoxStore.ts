import { create } from "zustand";
import type { ShareBoxCategory } from "@/data/mockDocs";

interface ShareBoxState {
  query: string;
  category: ShareBoxCategory | "all";
  setQuery: (query: string) => void;
  setCategory: (category: ShareBoxCategory | "all") => void;
}

export const useShareBoxStore = create<ShareBoxState>((set) => ({
  query: "",
  category: "all",
  setQuery: (query) => set({ query }),
  setCategory: (category) => set({ category }),
}));
