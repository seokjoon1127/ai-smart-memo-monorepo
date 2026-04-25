import { NavLink } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: JSX.Element;
}

const aiItems: NavItem[] = [
  {
    to: "/memo",
    label: "AI Smart Memo",
    icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
  },
  {
    to: "/sharebox",
    label: "ShareBox",
    icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
  },
];

const baseItems: NavItem[] = [
  {
    to: "/calendar",
    label: "일정 관리",
    icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    ),
  },
  {
    to: "/notes",
    label: "협업 메모",
    icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
        />
      </svg>
    ),
  },
  {
    to: "/team",
    label: "팀 협업",
    icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    to: "/notifications",
    label: "알림 자동화",
    icon: (
      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
    ),
  },
];

function navClass(isActive: boolean): string {
  const base =
    "w-full flex items-center px-3 py-2.5 mb-1 rounded-lg text-sm transition";
  return isActive
    ? `${base} bg-toss-blue-light text-toss-blue font-medium`
    : `${base} text-toss-gray-700 hover:bg-toss-gray-50`;
}

export function DemoSidebar() {
  return (
    <aside className="w-64 bg-white border-r border-toss-gray-100 flex flex-col">
      <div className="px-6 py-5 border-b border-toss-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-toss-blue rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-bold text-lg">NextWave</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <p className="px-3 mb-2 text-xs font-medium text-toss-gray-400 uppercase tracking-wider">
          AI Workspace
        </p>
        {aiItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navClass(isActive)}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}

        <p className="px-3 mt-6 mb-2 text-xs font-medium text-toss-gray-400 uppercase tracking-wider">
          기본 기능
        </p>
        {baseItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => navClass(isActive)}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-toss-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-toss-gray-50">
          <div className="w-8 h-8 bg-toss-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-toss-gray-600">
            데모
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">데모 사용자</p>
            <p className="text-xs text-toss-gray-400 truncate">
              demo@nextwave.com
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
