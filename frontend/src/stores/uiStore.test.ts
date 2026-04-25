import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { useUiStore } from "./uiStore";

beforeEach(() => {
  useUiStore.setState({ toastMessage: null, toastAction: null, modal: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("uiStore — confirm modal", () => {
  it("openConfirmModal 사용 시 modal 페이로드가 채워짐", () => {
    const onConfirm = vi.fn();
    useUiStore.getState().openConfirmModal({
      title: "QA 미팅",
      isoDate: "2026-04-28",
      category: "회의",
      categoryClass: "bg-toss-blue-light text-toss-blue",
      onConfirm,
    });
    const modal = useUiStore.getState().modal;
    expect(modal?.title).toBe("QA 미팅");
    expect(modal?.onConfirm).toBe(onConfirm);
  });

  it("closeConfirmModal 사용 시 modal이 null로 돌아감", () => {
    useUiStore.getState().openConfirmModal({
      title: "x",
      isoDate: "2026-04-25",
      category: "회의",
      categoryClass: "",
      onConfirm: () => {},
    });
    useUiStore.getState().closeConfirmModal();
    expect(useUiStore.getState().modal).toBe(null);
  });
});

describe("uiStore — toast", () => {
  it("showToast 사용 시 message 설정", () => {
    useUiStore.getState().showToast("저장됐어요");
    expect(useUiStore.getState().toastMessage).toBe("저장됐어요");
  });

  it("4초 후 자동으로 사라짐", () => {
    vi.useFakeTimers();
    useUiStore.getState().showToast("hi");
    expect(useUiStore.getState().toastMessage).toBe("hi");
    vi.advanceTimersByTime(4001);
    expect(useUiStore.getState().toastMessage).toBe(null);
  });

  it("showToast(action) 사용 시 toastAction도 함께 설정", () => {
    const onClick = vi.fn();
    useUiStore.getState().showToast("등록됨", { label: "캘린더 보기", onClick });
    const action = useUiStore.getState().toastAction;
    expect(action?.label).toBe("캘린더 보기");
    expect(action?.onClick).toBe(onClick);
  });

  it("hideToast 사용 시 즉시 사라짐", () => {
    useUiStore.getState().showToast("ping");
    useUiStore.getState().hideToast();
    expect(useUiStore.getState().toastMessage).toBe(null);
  });
});
