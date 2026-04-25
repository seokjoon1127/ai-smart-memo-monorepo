import { useEffect } from "react";
import { DemoHeader } from "@/components/shell/DemoHeader";
import { SearchBar } from "@/components/sharebox/SearchBar";
import { CategoryFilter } from "@/components/sharebox/CategoryFilter";
import { ShareDocCard } from "@/components/sharebox/ShareDocCard";
import { useShareBoxStore } from "@/stores/shareBoxStore";
import { useDebounce } from "@/hooks/useDebounce";

export function ShareBoxPage() {
  const items = useShareBoxStore((s) => s.items);
  const total = useShareBoxStore((s) => s.total);
  const query = useShareBoxStore((s) => s.query);
  const setQuery = useShareBoxStore((s) => s.setQuery);
  const category = useShareBoxStore((s) => s.category);
  const setCategory = useShareBoxStore((s) => s.setCategory);
  const fetch = useShareBoxStore((s) => s.fetch);
  const status = useShareBoxStore((s) => s.status);

  const debouncedQuery = useDebounce(query, 300);

  // 첫 진입 + query/category 변경 시마다 재조회 (debounce 300ms는 query에 적용)
  useEffect(() => {
    void fetch();
  }, [debouncedQuery, category, fetch]);

  return (
    <div>
      <DemoHeader
        title="ShareBox"
        subtitle="팀이 공유하는 문서 · AI가 일정에 자동으로 연결합니다"
        right={
          <button
            type="button"
            className="px-4 py-2 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-lg text-sm font-medium"
          >
            + 새 문서 추가
          </button>
        }
      />
      <div className="px-10 py-8">
        <SearchBar
          value={query}
          onChange={setQuery}
          count={total}
          query={debouncedQuery}
        />
        <CategoryFilter value={category} onChange={setCategory} />

        {status === "fetching" && items.length === 0 ? (
          <div className="text-center py-16 text-sm text-toss-gray-400">
            불러오는 중...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-toss-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-toss-gray-300"
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
            </div>
            <p className="text-base font-medium mb-1">검색 결과가 없어요</p>
            <p className="text-sm text-toss-gray-500">
              다른 키워드로 검색해보세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((doc) => (
              <ShareDocCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
