import type { DocCategory } from "@/types/api";

type CategoryValue = DocCategory | "all";

interface Item {
  value: CategoryValue;
  label: string;
}

const items: Item[] = [
  { value: "all", label: "전체" },
  { value: "meeting", label: "회의록" },
  { value: "project", label: "프로젝트" },
  { value: "report", label: "보고서" },
  { value: "memo", label: "개인 메모" },
];

interface Props {
  value: CategoryValue;
  onChange: (value: CategoryValue) => void;
}

export function CategoryFilter({ value, onChange }: Props) {
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {items.map((item) => {
        const active = value === item.value;
        const className = active
          ? "px-3 py-1.5 bg-toss-blue text-white rounded-full text-xs font-medium"
          : "px-3 py-1.5 bg-white border border-toss-gray-200 text-toss-gray-600 rounded-full text-xs font-medium hover:border-toss-blue";
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={className}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
