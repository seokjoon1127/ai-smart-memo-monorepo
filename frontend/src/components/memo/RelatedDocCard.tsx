import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { ShareDocDetailPanel } from "@/components/sharebox/ShareDocDetailPanel";
import { shareBoxApi } from "@/services";
import type { RelatedDoc } from "@/types/api";
import type { ShareDocDetail } from "@/types/api";

interface Props {
  doc: RelatedDoc;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function RelatedDocCard({ doc }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [detail, setDetail] = useState<ShareDocDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading",
  );

  const loadDetail = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await shareBoxApi.getDetail(doc.doc_id);
      setDetail(response);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [doc.doc_id]);

  useEffect(() => {
    if (!isOpen || detail) return;
    void loadDetail();
  }, [detail, isOpen, loadDetail]);

  useEffect(() => {
    if (!isOpen) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="mb-1.5 w-full rounded-lg bg-toss-gray-25 p-3 text-left transition hover:bg-toss-blue-50"
      >
        <div className="mb-1 flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            <FileText className="h-4 w-4 shrink-0 text-toss-blue" />
            <span className="truncate">{doc.title}</span>
          </p>
          <span className="shrink-0 text-xs text-toss-gray-400">
            {shortDate(doc.created_at)}
          </span>
        </div>
        <p className="line-clamp-1 text-xs text-toss-gray-500">
          {doc.preview}
        </p>
      </button>

      {isOpen && (
        <ShareDocDetailPanel
          fallbackDoc={doc}
          doc={detail}
          status={status}
          onClose={() => setIsOpen(false)}
          onRetry={loadDetail}
        />
      )}
    </>
  );
}
