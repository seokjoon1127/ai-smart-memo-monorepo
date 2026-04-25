import { useState, type ReactNode } from "react";
import { DemoHeader } from "@/components/shell/DemoHeader";

interface NotiItem {
  id: string;
  iconBg: string;
  iconColor: string;
  icon: ReactNode;
  title: string;
  description: string;
  defaultEnabled: boolean;
}

const items: NotiItem[] = [
  {
    id: "before-10",
    iconBg: "bg-toss-blue-light",
    iconColor: "text-toss-blue",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    ),
    title: "일정 시작 10분 전",
    description: "모든 회의 일정에 자동 알림",
    defaultEnabled: true,
  },
  {
    id: "conflict",
    iconBg: "bg-toss-warning-bg",
    iconColor: "text-toss-warning",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    ),
    title: "일정 충돌 감지 시",
    description: "시간이 겹치는 일정이 있으면 즉시 알림",
    defaultEnabled: true,
  },
  {
    id: "mention",
    iconBg: "bg-toss-success-bg",
    iconColor: "text-toss-success",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857"
      />
    ),
    title: "팀원 멘션 시",
    description: "메모나 일정에 @멘션 되면 알림",
    defaultEnabled: false,
  },
  {
    id: "daily-9",
    iconBg: "bg-toss-gray-50",
    iconColor: "text-toss-gray-400",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    ),
    title: "매일 오전 9시 일정 요약",
    description: "하루 일정을 이메일로 받아보기",
    defaultEnabled: false,
  },
];

export function NotificationPage() {
  const [toggled, setToggled] = useState(() =>
    Object.fromEntries(items.map((item) => [item.id, item.defaultEnabled])),
  );

  return (
    <div>
      <DemoHeader
        title="알림 자동화"
        subtitle="조건에 따라 자동으로 알림을 받으세요"
      />

      <div className="px-10 py-8">
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-xl p-5 border border-toss-gray-100 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 ${item.iconBg} rounded-lg flex items-center justify-center`}
                >
                  <svg
                    className={`w-5 h-5 ${item.iconColor}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {item.icon}
                  </svg>
                </div>
                <div>
                  <p className="font-medium mb-1">{item.title}</p>
                  <p className="text-xs text-toss-gray-500">
                    {item.description}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={toggled[item.id]}
                  onChange={(event) =>
                    setToggled((prev) => ({
                      ...prev,
                      [item.id]: event.target.checked,
                    }))
                  }
                />
                <div className="w-11 h-6 bg-toss-gray-200 peer-checked:bg-toss-blue rounded-full peer transition-all relative">
                  <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
