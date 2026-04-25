import { useMemoStore } from "@/stores/memoStore";
import { demoMemoSeeds } from "@/data/mockNotes";

export function MemoEditor() {
  const content = useMemoStore((s) => s.content);
  const setContent = useMemoStore((s) => s.setContent);
  const status = useMemoStore((s) => s.status);
  const saveAndParse = useMemoStore((s) => s.saveAndParse);

  const isLoading = status === "parsing";
  const isEmpty = content.trim().length === 0;

  return (
    <div className="max-w-3xl mx-auto">
      <p className="text-sm text-toss-blue font-medium mb-2">STEP 1 / 3</p>
      <h2 className="text-3xl font-bold mb-3 leading-tight">
        메모를 적어보세요
      </h2>
      <p className="text-base text-toss-gray-500 mb-10">
        자연어로 일정을 적으면 AI가 알아서 정리해드려요
      </p>

      <div className="flex gap-2 mb-3 flex-wrap">
        <span className="text-xs text-toss-gray-400 self-center">
          시연 시드:
        </span>
        {demoMemoSeeds.map((seed) => (
          <button
            key={seed.id}
            type="button"
            onClick={() => setContent(seed.content)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 bg-white border border-toss-gray-200 text-toss-gray-700 rounded-full font-medium hover:border-toss-blue hover:text-toss-blue transition disabled:opacity-50"
          >
            {seed.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 mb-4">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="예: 내일 3시 김팀장 회의, 금요일까지 보고서 제출"
          className="w-full min-h-[160px] resize-none text-base leading-relaxed outline-none placeholder:text-toss-gray-300"
        />
        <div className="flex items-center justify-between pt-4 border-t border-toss-gray-100 mt-4">
          <div className="flex gap-2">
            <span className="text-xs px-2.5 py-1 bg-toss-blue-light text-toss-blue rounded-full font-medium">
              자동 일정 생성
            </span>
            <span className="text-xs px-2.5 py-1 bg-toss-purple-bg text-toss-purple rounded-full font-medium">
              RAG 자동 연결
            </span>
          </div>
          <span className="text-xs text-toss-gray-400">
            {isLoading ? "파싱 중..." : "자동 저장됨"}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={isEmpty || isLoading}
        onClick={() => saveAndParse()}
        className="w-full py-4 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-xl font-medium text-base transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "AI가 파싱 중이에요..." : "AI 파싱 시작"}
      </button>

    </div>
  );
}
