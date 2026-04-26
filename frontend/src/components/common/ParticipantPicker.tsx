import { useEffect, useMemo, useRef, useState } from "react";
import { mockTeam } from "@/data/mockTeam";

const SELF: { name: string; role: string; initial: string; avatarBg: string } =
  {
    name: "본인",
    role: "나",
    initial: "나",
    avatarBg: "bg-toss-blue",
  };

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function ParticipantPicker({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const allMembers = useMemo(
    () => [
      SELF,
      ...mockTeam.map((m) => ({
        name: m.name,
        role: m.role,
        initial: m.initial,
        avatarBg: m.avatarBg,
      })),
    ],
    [],
  );

  const candidates = useMemo(
    () => allMembers.filter((m) => !value.includes(m.name)),
    [allMembers, value],
  );

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setCustomText("");
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const addParticipant = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
  };

  const removeParticipant = (name: string) => {
    onChange(value.filter((n) => n !== name));
  };

  const submitCustom = () => {
    const next = customText.trim();
    if (!next) return;
    addParticipant(next);
    setCustomText("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap gap-1.5 min-h-[40px] px-2 py-1.5 border border-toss-gray-200 rounded-lg focus-within:border-toss-blue bg-white">
        {value.length === 0 && !open && (
          <span className="text-sm text-toss-gray-300 px-1 py-1">
            {placeholder ?? "참석자를 추가하세요"}
          </span>
        )}
        {value.map((name) => {
          const member = allMembers.find((m) => m.name === name);
          return (
            <span
              key={name}
              className="inline-flex items-center gap-1 pl-1 pr-1.5 py-0.5 bg-toss-blue-50 text-toss-blue rounded-full text-xs font-medium"
            >
              {member ? (
                <span
                  className={`w-4 h-4 rounded-full ${member.avatarBg} text-white text-[9px] flex items-center justify-center`}
                >
                  {member.initial}
                </span>
              ) : (
                <span className="w-4 h-4 rounded-full bg-toss-gray-300 text-white text-[9px] flex items-center justify-center">
                  ?
                </span>
              )}
              <span>{name}</span>
              <button
                type="button"
                onClick={() => removeParticipant(name)}
                className="text-toss-blue/60 hover:text-toss-blue ml-0.5"
                aria-label={`${name} 제거`}
              >
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-0.5 px-2 py-0.5 text-xs text-toss-gray-500 hover:text-toss-blue rounded-full"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          추가
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 bg-white border border-toss-gray-100 rounded-xl shadow-lg max-h-72 overflow-y-auto">
          {candidates.length === 0 && customText.trim() === "" && (
            <div className="px-3 py-3 text-xs text-toss-gray-400">
              모든 팀원이 추가되었어요. 직접 입력으로 외부 참석자를 추가할 수 있어요.
            </div>
          )}
          {candidates.map((member) => (
            <button
              key={member.name}
              type="button"
              onClick={() => {
                addParticipant(member.name);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-toss-gray-25 transition"
            >
              <span
                className={`w-7 h-7 rounded-full ${member.avatarBg} text-white text-xs font-medium flex items-center justify-center`}
              >
                {member.initial}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{member.name}</p>
                <p className="text-[11px] text-toss-gray-500 truncate">
                  {member.role}
                </p>
              </div>
            </button>
          ))}
          <div className="border-t border-toss-gray-100 p-2 flex gap-1.5">
            <input
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submitCustom();
                }
              }}
              placeholder="직접 입력 (외부 참석자)"
              className="flex-1 px-2.5 py-1.5 text-xs border border-toss-gray-200 rounded-lg outline-none focus:border-toss-blue placeholder:text-toss-gray-300"
            />
            <button
              type="button"
              onClick={submitCustom}
              disabled={!customText.trim()}
              className="px-3 py-1.5 text-xs bg-toss-blue text-white rounded-lg font-medium disabled:bg-toss-gray-200 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
