import { useNavigate } from "react-router-dom";
import { useUiStore } from "@/stores/uiStore";
import { useToast } from "@/hooks/useToast";

interface Suggestion {
  title: string;
  isoDate: string;
  category: string;
  categoryClass: string;
  description: string;
}

interface Props {
  suggestion: Suggestion;
}

export function SuggestionBox({ suggestion }: Props) {
  const openConfirmModal = useUiStore((s) => s.openConfirmModal);
  const showToast = useToast();
  const navigate = useNavigate();

  const handleClick = () => {
    openConfirmModal({
      title: suggestion.title,
      isoDate: suggestion.isoDate,
      category: suggestion.category,
      categoryClass: suggestion.categoryClass,
      onConfirm: () => {
        showToast(`'${suggestion.title}' 일정이 등록됐어요`, {
          label: "캘린더 보기",
          onClick: () => navigate("/calendar"),
        });
      },
    });
  };

  return (
    <div className="bg-toss-blue-50 rounded-lg p-3 border border-toss-blue-light">
      <p className="text-xs text-toss-blue font-medium mb-1.5">💡 AI 제안</p>
      <p
        className="text-sm mb-2"
        dangerouslySetInnerHTML={{ __html: suggestion.description }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClick}
          className="px-3 py-1.5 bg-toss-blue text-white rounded-md text-xs font-medium hover:bg-toss-blue-hover"
        >
          일정 만들기
        </button>
        <button
          type="button"
          className="px-3 py-1.5 bg-white border border-toss-gray-200 text-toss-gray-500 rounded-md text-xs font-medium hover:bg-toss-gray-50"
        >
          나중에
        </button>
      </div>
    </div>
  );
}
