import { useUiStore } from "@/stores/uiStore";
import { formatDateKo } from "@/utils/date";

export function ConfirmModal() {
  const modal = useUiStore((s) => s.modal);
  const close = useUiStore((s) => s.closeConfirmModal);
  if (!modal) return null;

  const handleConfirm = () => {
    modal.onConfirm();
    close();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="bg-white rounded-2xl p-7 w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-toss-blue-light rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-toss-blue"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold">일정을 만들까요?</h3>
            <p className="text-xs text-toss-gray-500 mt-0.5">
              일정 관리에 추가됩니다
            </p>
          </div>
        </div>

        <div className="bg-toss-gray-25 rounded-xl p-4 mb-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-base font-bold">{modal.title}</p>
            <span
              className={`text-[11px] px-2 py-0.5 rounded font-medium ${modal.categoryClass}`}
            >
              {modal.category}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-toss-gray-500">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>{formatDateKo(modal.isoDate)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={close}
            className="flex-1 py-3 bg-toss-gray-50 hover:bg-toss-gray-100 text-toss-gray-700 rounded-xl text-sm font-medium"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-3 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl text-sm font-medium"
          >
            일정 만들기
          </button>
        </div>
      </div>
    </div>
  );
}
