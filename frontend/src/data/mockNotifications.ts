/**
 * 알림 자동화 페이지의 토글 항목들.
 * iconPath는 SVG <path d="..."> 값이라 페이지에서 그대로 <svg><path d=... /></svg>로 렌더한다.
 */

export interface NotificationItem {
  id: string;
  iconBg: string;
  iconColor: string;
  iconPath: string;
  title: string;
  description: string;
  defaultEnabled: boolean;
}

export const mockNotifications: NotificationItem[] = [
  {
    id: "before-10",
    iconBg: "bg-toss-blue-light",
    iconColor: "text-toss-blue",
    iconPath: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    title: "일정 시작 10분 전",
    description: "모든 회의 일정에 자동 알림",
    defaultEnabled: true,
  },
  {
    id: "conflict",
    iconBg: "bg-toss-warning-bg",
    iconColor: "text-toss-warning",
    iconPath:
      "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    title: "일정 충돌 감지 시",
    description: "시간이 겹치는 일정이 있으면 즉시 알림",
    defaultEnabled: true,
  },
  {
    id: "mention",
    iconBg: "bg-toss-success-bg",
    iconColor: "text-toss-success",
    iconPath: "M17 20h5v-2a3 3 0 00-5.356-1.857",
    title: "팀원 멘션 시",
    description: "메모나 일정에 @멘션 되면 알림",
    defaultEnabled: false,
  },
  {
    id: "daily-9",
    iconBg: "bg-toss-gray-50",
    iconColor: "text-toss-gray-400",
    iconPath:
      "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    title: "매일 오전 9시 일정 요약",
    description: "하루 일정을 이메일로 받아보기",
    defaultEnabled: false,
  },
];
