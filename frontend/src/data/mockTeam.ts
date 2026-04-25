export interface TeamMember {
  initial: string;
  name: string;
  email: string;
  role: string;
  roleClass: string;
  avatarBg: string;
}

export const mockTeam: TeamMember[] = [
  {
    initial: "김",
    name: "김팀장",
    email: "kim@nextwave.com",
    role: "관리자",
    roleClass: "bg-toss-purple-bg text-toss-purple",
    avatarBg: "bg-toss-blue",
  },
  {
    initial: "이",
    name: "이수진",
    email: "lee@nextwave.com",
    role: "디자이너",
    roleClass: "bg-toss-gray-50 text-toss-gray-600",
    avatarBg: "bg-toss-purple",
  },
  {
    initial: "박",
    name: "박민수",
    email: "park@nextwave.com",
    role: "개발자",
    roleClass: "bg-toss-gray-50 text-toss-gray-600",
    avatarBg: "bg-toss-warning",
  },
  {
    initial: "최",
    name: "최지영",
    email: "choi@nextwave.com",
    role: "PM",
    roleClass: "bg-toss-gray-50 text-toss-gray-600",
    avatarBg: "bg-toss-success",
  },
  {
    initial: "정",
    name: "정현우",
    email: "jung@nextwave.com",
    role: "초대 대기",
    roleClass: "bg-toss-warning-bg text-toss-warning",
    avatarBg: "bg-toss-gray-300",
  },
];
