/**
 * 시연용 메모 시드 3종 — 사용자가 STEP 1에서 빠르게 골라 입력할 수 있게 하기 위한
 * 텍스트 시나리오. mockApi.memo.parse가 content 안의 키워드("김팀장"/"클라이언트")로
 * mockParseResults의 분기를 결정한다.
 */

export interface DemoMemoSeed {
  id: string;
  label: string;
  content: string;
}

export const demoMemoSeeds: DemoMemoSeed[] = [
  {
    id: "seed_team",
    label: "김팀장 회의 + 보고서",
    content: "내일 3시 김팀장 회의, 금요일까지 보고서 제출",
  },
  {
    id: "seed_client",
    label: "클라이언트 미팅",
    content: "다음주 화요일 오후 2시 클라이언트 미팅, 강남 사무실",
  },
  {
    id: "seed_empty",
    label: "빈 메모 (일정 없음)",
    content: "오늘 점심 뭐 먹지",
  },
];
