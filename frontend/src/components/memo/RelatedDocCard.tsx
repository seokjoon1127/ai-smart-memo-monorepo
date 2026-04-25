import { useNavigate } from "react-router-dom";
import type { RelatedNote } from "@/types/api";

interface Props {
  note: RelatedNote;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function RelatedDocCard({ note }: Props) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate("/sharebox")}
      className="w-full text-left bg-toss-gray-25 rounded-lg p-3 mb-1.5 hover:bg-toss-blue-50 transition"
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-medium">📄 메모 #{note.note_id}</p>
        <span className="text-xs text-toss-gray-400">
          {shortDate(note.created_at)}
        </span>
      </div>
      <p className="text-xs text-toss-gray-500 line-clamp-1">
        {note.content}
      </p>
    </button>
  );
}
