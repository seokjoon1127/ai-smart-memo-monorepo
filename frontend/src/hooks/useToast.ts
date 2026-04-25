import { useUiStore } from "@/stores/uiStore";

export function useToast() {
  const showToast = useUiStore((state) => state.showToast);
  return showToast;
}
