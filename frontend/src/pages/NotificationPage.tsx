import { useState } from "react";
import { DemoHeader } from "@/components/shell/DemoHeader";
import { mockNotifications } from "@/data/mockNotifications";

export function NotificationPage() {
  const [toggled, setToggled] = useState(() =>
    Object.fromEntries(
      mockNotifications.map((item) => [item.id, item.defaultEnabled]),
    ),
  );

  return (
    <div>
      <DemoHeader
        title="알림 자동화"
        subtitle="조건에 따라 자동으로 알림을 받으세요"
      />

      <div className="px-10 py-8">
        <div className="space-y-3">
          {mockNotifications.map((item) => (
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
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={item.iconPath}
                    />
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
