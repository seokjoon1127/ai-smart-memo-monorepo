import { useEffect } from "react";
import { useMemoStore } from "@/stores/memoStore";
import { useScheduleStore } from "@/stores/scheduleStore";
import { DemoHeader } from "@/components/shell/DemoHeader";
import { MemoEditor } from "@/components/memo/MemoEditor";
import { PreviewCardList } from "@/components/memo/PreviewCardList";
import { ScheduleResultCard } from "@/components/memo/ScheduleResultCard";

const STEPS = [
  { num: 1, label: "메모" },
  { num: 2, label: "미리보기" },
  { num: 3, label: "상세" },
] as const;

function StepIndicator() {
  const step = useMemoStore((s) => s.step);
  const setStep = useMemoStore((s) => s.setStep);

  return (
    <div className="flex items-center gap-2 text-xs">
      {STEPS.map(({ num, label }, index) => {
        const isActive = step === num;
        const isDone = step > num;
        const numClass = isActive
          ? "bg-toss-blue text-white"
          : isDone
            ? "bg-toss-blue-light text-toss-blue"
            : "bg-toss-gray-100 text-toss-gray-500";
        const labelClass = isActive
          ? "text-toss-gray-900 font-medium"
          : isDone
            ? "text-toss-gray-700"
            : "text-toss-gray-400";
        return (
          <div key={num} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(num as 1 | 2 | 3)}
              className="flex items-center"
            >
              <span
                className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-medium ${numClass}`}
              >
                {num}
              </span>
              <span className={`ml-1.5 ${labelClass}`}>{label}</span>
            </button>
            {index < STEPS.length - 1 && (
              <div className="w-6 h-px bg-toss-gray-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StepThree() {
  const reset = useMemoStore((s) => s.reset);
  const recentlyCreated = useScheduleStore((s) => s.recentlyCreated);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-toss-blue font-medium">
          STEP 3 / 3 · 등록 완료
        </p>
        <span className="text-xs px-2.5 py-1 bg-toss-blue-light text-toss-blue rounded-full font-medium">
          Google Calendar 동기화됨
        </span>
      </div>
      <h2 className="text-3xl font-bold mb-2 leading-tight">
        {recentlyCreated.length}개 일정이 등록됐어요
      </h2>
      <p className="text-base text-toss-gray-500 mb-8">
        각 일정에 ShareBox의 관련 문서가 자동으로 연결됐어요
      </p>

      {recentlyCreated.map((schedule) => (
        <ScheduleResultCard key={schedule.id} schedule={schedule} />
      ))}

      <button
        type="button"
        onClick={reset}
        className="w-full py-3 bg-toss-gray-50 hover:bg-toss-gray-100 text-toss-gray-700 rounded-xl text-sm font-medium"
      >
        처음부터 다시 보기
      </button>
    </div>
  );
}

export function MemoPage() {
  const step = useMemoStore((s) => s.step);
  const setStep = useMemoStore((s) => s.setStep);

  useEffect(() => {
    return () => {
      // when leaving the memo page, return to step 1 next time
      setStep(1);
    };
  }, [setStep]);

  return (
    <div>
      <DemoHeader
        title="AI Smart Memo"
        subtitle="메모를 적으면 AI가 자동으로 일정을 만들어드려요"
        right={<StepIndicator />}
        centered
      />
      <div className="px-10 py-12">
        {step === 1 && <MemoEditor />}
        {step === 2 && <PreviewCardList />}
        {step === 3 && <StepThree />}
      </div>
    </div>
  );
}
