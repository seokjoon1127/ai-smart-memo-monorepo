import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** centered means we constrain to a max-w container (memo page header) */
  centered?: boolean;
}

export function DemoHeader({ title, subtitle, right, centered }: Props) {
  const innerClass = centered
    ? "flex items-center justify-between max-w-5xl mx-auto"
    : "flex items-center justify-between";
  return (
    <header className="bg-white border-b border-toss-gray-100 px-10 py-5">
      <div className={innerClass}>
        <div>
          <h1 className="text-xl font-bold mb-1">{title}</h1>
          {subtitle && (
            <p className="text-sm text-toss-gray-500">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}
