import { useUiStore } from "@/stores/uiStore";

export function Toast() {
  const message = useUiStore((s) => s.toastMessage);
  const action = useUiStore((s) => s.toastAction);
  const hide = useUiStore((s) => s.hideToast);
  if (!message) return null;

  return (
    <div
      className="fixed bottom-8 left-1/2 z-50"
      style={{ transform: "translateX(-50%)" }}
    >
      <div className="bg-toss-gray-900 text-white px-5 py-3.5 rounded-xl shadow-lg flex items-center gap-3">
        <svg
          className="w-5 h-5 text-toss-success"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <p className="text-sm font-medium">{message}</p>
        {action && (
          <button
            type="button"
            onClick={() => {
              action.onClick();
              hide();
            }}
            className="text-xs text-toss-blue-light underline ml-2 hover:text-white"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
