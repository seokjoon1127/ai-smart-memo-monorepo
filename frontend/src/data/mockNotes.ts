export type CollabCategory = "meeting" | "project" | "idea" | "personal";

export interface CollabNote {
  id: number;
  title: string;
  category: CollabCategory;
  categoryLabel: string;
  categoryClass: string;
  preview: string;
  updatedLabel: string;
  participants: { initial: string; bg: string }[];
  participantsLabel: string;
}

export const mockCollabNotes: CollabNote[] = [
  {
    id: 1,
    title: "김팀장 주간회의 메모",
    category: "meeting",
    categoryLabel: "회의",
    categoryClass: "bg-toss-blue-light text-toss-blue",
    preview:
      "디자인 시안 피드백 완료. QA 일정 조율이 시급함. 다음주 월요일까지 QA 킥오프 일정 확정 필요...",
    updatedLabel: "2시간 전",
    participants: [
      { initial: "김", bg: "bg-toss-blue" },
      { initial: "이", bg: "bg-toss-purple" },
      { initial: "박", bg: "bg-toss-warning" },
    ],
    participantsLabel: "3명 참여",
  },
  {
    id: 2,
    title: "프로젝트A 진행상황",
    category: "project",
    categoryLabel: "프로젝트",
    categoryClass: "bg-toss-purple-bg text-toss-purple",
    preview:
      "백엔드 API 완료. 프론트엔드 작업 중. RAG 시스템 연동은 다음 스프린트로 계획...",
    updatedLabel: "어제",
    participants: [
      { initial: "최", bg: "bg-toss-success" },
      { initial: "김", bg: "bg-toss-blue" },
    ],
    participantsLabel: "2명 참여",
  },
  {
    id: 3,
    title: "신규 기능 브레인스토밍",
    category: "idea",
    categoryLabel: "아이디어",
    categoryClass: "bg-toss-warning-bg text-toss-warning",
    preview:
      "사용자 피드백 분석 결과, 무료체험 가치 부족 24%. AI 자동화로 해결 가능한 영역들...",
    updatedLabel: "3일 전",
    participants: [{ initial: "이", bg: "bg-toss-purple" }],
    participantsLabel: "1명 참여",
  },
  {
    id: 4,
    title: "팀 스탠드업 (4/15)",
    category: "meeting",
    categoryLabel: "회의",
    categoryClass: "bg-toss-blue-light text-toss-blue",
    preview:
      "각자 이번 주 목표 공유. 이수진: 디자인 시스템 v2 / 박민수: API 명세 정리...",
    updatedLabel: "5일 전",
    participants: [
      { initial: "이", bg: "bg-toss-purple" },
      { initial: "박", bg: "bg-toss-warning" },
      { initial: "김", bg: "bg-toss-blue" },
    ],
    participantsLabel: "4명 참여",
  },
  {
    id: 5,
    title: "개인 회고 노트",
    category: "personal",
    categoryLabel: "개인",
    categoryClass: "bg-toss-success-bg text-toss-success",
    preview: "이번 주 잘한 것, 개선할 것, 다음 주 우선순위 정리...",
    updatedLabel: "1주 전",
    participants: [],
    participantsLabel: "비공개",
  },
  {
    id: 6,
    title: "QA 프로세스 개선안",
    category: "project",
    categoryLabel: "프로젝트",
    categoryClass: "bg-toss-purple-bg text-toss-purple",
    preview:
      "자동화 테스트 도입, 회귀 테스트 주기 단축, 버그 트래킹 통합...",
    updatedLabel: "2주 전",
    participants: [
      { initial: "최", bg: "bg-toss-success" },
      { initial: "박", bg: "bg-toss-warning" },
    ],
    participantsLabel: "2명 참여",
  },
];
