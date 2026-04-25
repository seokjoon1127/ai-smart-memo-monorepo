interface Props {
  value: string;
  onChange: (value: string) => void;
  count: number;
  query: string;
}

export function SearchBar({ value, onChange, count, query }: Props) {
  return (
    <div className="bg-white rounded-xl border border-toss-gray-100 p-2 mb-4 flex items-center gap-2">
      <svg
        className="w-5 h-5 text-toss-gray-400 ml-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="제목으로 검색해보세요 (예: 김팀장, 프로젝트A, QA)"
        className="flex-1 px-2 py-2 text-sm outline-none bg-transparent"
      />
      <span className="text-xs text-toss-gray-400 mr-3">
        {query ? `검색 결과 ${count}개` : `전체 ${count}개`}
      </span>
    </div>
  );
}
