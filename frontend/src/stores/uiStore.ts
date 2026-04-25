import { create } from "zustand";

export interface ConfirmModalPayload {
  title: string;
  isoDate: string;
  category: string;
  categoryClass: string;
  onConfirm: () => void;
}

interface UiState {
  modal: ConfirmModalPayload | null;
  toastMessage: string | null;
  toastAction: { label: string; onClick: () => void } | null;
  openConfirmModal: (payload: ConfirmModalPayload) => void;
  closeConfirmModal: () => void;
  showToast: (
    message: string,
    action?: { label: string; onClick: () => void },
  ) => void;
  hideToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>((set) => ({
  modal: null,
  toastMessage: null,
  toastAction: null,
  openConfirmModal: (payload) => set({ modal: payload }),
  closeConfirmModal: () => set({ modal: null }),
  showToast: (message, action) => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: message, toastAction: action ?? null });
    toastTimer = setTimeout(() => {
      set({ toastMessage: null, toastAction: null });
    }, 4000);
  },
  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toastMessage: null, toastAction: null });
  },
}));
