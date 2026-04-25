import type { DocCategory, ShareDoc } from "@/types/api";

export const mockShareBox: ShareDoc[] = [
  {
    id: "doc_001",
    title: "김팀장 주간회의 메모",
    category: "meeting",
    author: "김팀장",
    preview:
      "디자인 시안 피드백 완료. QA 일정 조율 시급. 다음주 월요일까지 QA 킥오프 일정 확정 필요.",
    tags: ["회의록", "김팀장", "QA"],
    created_at: "2026-04-16T10:00:00+09:00",
    indexed: true,
  },
  {
    id: "doc_002",
    title: "프로젝트A 진행상황",
    category: "project",
    author: "박민수",
    preview:
      "백엔드 API 완료, 프론트 작업 중. RAG 시스템 연동은 다음 스프린트로 계획.",
    tags: ["프로젝트A", "개발"],
    created_at: "2026-04-10T14:00:00+09:00",
    indexed: true,
  },
  {
    id: "doc_003",
    title: "2026 Q1 분석 보고서",
    category: "report",
    author: "최지영",
    preview:
      "Q1 KPI 분석 결과 무료체험 가치 부족 24%, 팀 기능 이해 부족 16%로 확인됨.",
    tags: ["보고서", "Q1", "분석"],
    created_at: "2026-04-05T09:00:00+09:00",
    indexed: true,
  },
  {
    id: "doc_004",
    title: "신규 기능 브레인스토밍",
    category: "memo",
    author: "이수진",
    preview:
      "AI 자동화로 해결 가능한 영역. 메모 → 일정 자동 생성, RAG 기반 추천.",
    tags: ["아이디어", "AI"],
    created_at: "2026-04-12T16:00:00+09:00",
    indexed: true,
  },
  {
    id: "doc_005",
    title: "팀 스탠드업 (4/15)",
    category: "meeting",
    author: "김팀장",
    preview:
      "각자 이번 주 목표 공유. 이수진: 디자인 시스템 v2 / 박민수: API 명세 정리.",
    tags: ["스탠드업", "주간"],
    created_at: "2026-04-15T10:30:00+09:00",
    indexed: true,
  },
  {
    id: "doc_006",
    title: "QA 프로세스 개선안",
    category: "project",
    author: "최지영",
    preview: "자동화 테스트 도입, 회귀 테스트 주기 단축, 버그 트래킹 도구 통합.",
    tags: ["QA", "프로세스"],
    created_at: "2026-04-08T11:00:00+09:00",
    indexed: true,
  },
  {
    id: "doc_007",
    title: "사용자 피드백 요약",
    category: "report",
    author: "박민수",
    preview:
      "가입 절차 복잡 28%, 무료체험 가치 부족 24%, 요금제 이해 어려움 18%.",
    tags: ["피드백", "사용자"],
    created_at: "2026-04-03T15:00:00+09:00",
    indexed: true,
  },
  {
    id: "doc_008",
    title: "개인 회고 노트",
    category: "memo",
    author: "본인",
    preview: "이번 주 잘한 것, 개선할 것, 다음 주 우선순위 정리.",
    tags: ["회고", "개인"],
    created_at: "2026-04-18T20:00:00+09:00",
    indexed: true,
  },
];

export const docCategoryLabel: Record<DocCategory, string> = {
  meeting: "회의록",
  project: "프로젝트",
  report: "보고서",
  memo: "개인 메모",
};

export const docCategoryColor: Record<DocCategory, string> = {
  meeting: "bg-toss-blue-light text-toss-blue",
  project: "bg-toss-purple-bg text-toss-purple",
  report: "bg-toss-warning-bg text-toss-warning",
  memo: "bg-toss-success-bg text-toss-success",
};
