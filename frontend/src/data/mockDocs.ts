export type ShareBoxCategory = "meeting" | "project" | "report" | "memo";

export interface ShareBoxDoc {
  id: number;
  title: string;
  category: ShareBoxCategory;
  author: string;
  date: string;
  preview: string;
  tags: string[];
  shared: number;
}

export const mockDocs: ShareBoxDoc[] = [
  {
    id: 1,
    title: "김팀장 주간회의 메모",
    category: "meeting",
    author: "김팀장",
    date: "2026-04-16",
    preview:
      "디자인 시안 피드백 완료. QA 일정 조율 시급. 다음주 월요일까지 QA 킥오프 일정 확정 필요.",
    tags: ["회의록", "김팀장", "QA"],
    shared: 5,
  },
  {
    id: 2,
    title: "프로젝트A 진행상황",
    category: "project",
    author: "박민수",
    date: "2026-04-10",
    preview:
      "백엔드 API 완료, 프론트 작업 중. RAG 시스템 연동은 다음 스프린트로 계획.",
    tags: ["프로젝트A", "개발"],
    shared: 3,
  },
  {
    id: 3,
    title: "2026 Q1 분석 보고서",
    category: "report",
    author: "최지영",
    date: "2026-04-05",
    preview:
      "Q1 KPI 분석 결과 무료체험 가치 부족 24%, 팀 기능 이해 부족 16%로 확인됨.",
    tags: ["보고서", "Q1", "분석"],
    shared: 5,
  },
  {
    id: 4,
    title: "신규 기능 브레인스토밍",
    category: "memo",
    author: "이수진",
    date: "2026-04-12",
    preview:
      "AI 자동화로 해결 가능한 영역. 메모 → 일정 자동 생성, RAG 기반 추천.",
    tags: ["아이디어", "AI"],
    shared: 2,
  },
  {
    id: 5,
    title: "팀 스탠드업 (4/15)",
    category: "meeting",
    author: "김팀장",
    date: "2026-04-15",
    preview:
      "각자 이번 주 목표 공유. 이수진: 디자인 시스템 v2 / 박민수: API 명세 정리.",
    tags: ["스탠드업", "주간"],
    shared: 4,
  },
  {
    id: 6,
    title: "QA 프로세스 개선안",
    category: "project",
    author: "최지영",
    date: "2026-04-08",
    preview: "자동화 테스트 도입, 회귀 테스트 주기 단축, 버그 트래킹 도구 통합.",
    tags: ["QA", "프로세스"],
    shared: 3,
  },
  {
    id: 7,
    title: "사용자 피드백 요약",
    category: "report",
    author: "박민수",
    date: "2026-04-03",
    preview:
      "가입 절차 복잡 28%, 무료체험 가치 부족 24%, 요금제 이해 어려움 18%.",
    tags: ["피드백", "사용자"],
    shared: 5,
  },
  {
    id: 8,
    title: "개인 회고 노트",
    category: "memo",
    author: "본인",
    date: "2026-04-18",
    preview: "이번 주 잘한 것, 개선할 것, 다음 주 우선순위 정리.",
    tags: ["회고", "개인"],
    shared: 1,
  },
];

export const categoryLabel: Record<ShareBoxCategory, string> = {
  meeting: "회의록",
  project: "프로젝트",
  report: "보고서",
  memo: "개인 메모",
};

export const categoryColor: Record<ShareBoxCategory, string> = {
  meeting: "bg-toss-blue-light text-toss-blue",
  project: "bg-toss-purple-bg text-toss-purple",
  report: "bg-toss-warning-bg text-toss-warning",
  memo: "bg-toss-success-bg text-toss-success",
};
