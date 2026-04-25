import {
  docCategoryColor,
  docCategoryLabel,
} from "@/data/mockShareBox";
import type { ShareDoc } from "@/types/api";

interface Props {
  doc: ShareDoc;
}

function shortDate(iso: string): string {
  // "2026-04-16T10:00:00+09:00" → "04/16"
  return iso.slice(5, 10).replace("-", "/");
}

export function ShareDocCard({ doc }: Props) {
  return (
    <div className="bg-white rounded-xl p-4 border border-toss-gray-100 hover:border-toss-blue transition cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${docCategoryColor[doc.category]}`}
          >
            {docCategoryLabel[doc.category]}
          </span>
          <h3 className="font-medium truncate">{doc.title}</h3>
        </div>
        <span className="text-xs text-toss-gray-400 shrink-0 ml-2">
          {shortDate(doc.created_at)}
        </span>
      </div>
      <p className="text-sm text-toss-gray-500 mb-3 line-clamp-1">
        {doc.preview}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-toss-gray-400 flex-wrap">
          <span>✏ {doc.author}</span>
          <div className="flex gap-1">
            {doc.tags.map((tag) => (
              <span
                key={tag}
                className="px-1.5 py-0.5 bg-toss-gray-50 text-toss-gray-600 rounded text-[10px]"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
