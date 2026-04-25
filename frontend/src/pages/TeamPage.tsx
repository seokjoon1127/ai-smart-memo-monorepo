import { DemoHeader } from "@/components/shell/DemoHeader";
import { mockTeam } from "@/data/mockTeam";

export function TeamPage() {
  return (
    <div>
      <DemoHeader
        title="팀 협업"
        subtitle="함께 일하는 팀원을 관리하세요"
        right={
          <button
            type="button"
            className="px-4 py-2 bg-toss-blue hover:bg-toss-blue-hover text-white rounded-lg text-sm font-medium"
          >
            + 팀원 초대
          </button>
        }
      />

      <div className="px-10 py-8">
        <div className="bg-white rounded-2xl border border-toss-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold">NextWave 팀</h2>
            <span className="text-xs text-toss-gray-500">
              {mockTeam.length}명
            </span>
          </div>
          <p className="text-sm text-toss-gray-500 mb-6">
            생산성 SaaS 개발 팀
          </p>
          <div className="space-y-1">
            {mockTeam.map((member) => (
              <div
                key={member.email}
                className="flex items-center justify-between p-3 hover:bg-toss-gray-25 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 ${member.avatarBg} text-white text-sm font-medium rounded-full flex items-center justify-center`}
                  >
                    {member.initial}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.name}</p>
                    <p className="text-xs text-toss-gray-500">
                      {member.email}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${member.roleClass}`}
                >
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
