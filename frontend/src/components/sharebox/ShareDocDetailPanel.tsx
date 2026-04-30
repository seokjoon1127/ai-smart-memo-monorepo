import { AlertCircle, CalendarDays, FileText, Loader2, Tag, UserRound, X } from "lucide-react";
import {
  docCategoryColor,
  docCategoryLabel,
} from "@/data/mockShareBox";
import type { RelatedDoc, ShareDocDetail } from "@/types/api";

interface Props {
  fallbackDoc: RelatedDoc;
  doc: ShareDocDetail | null;
  status: "loading" | "error" | "success";
  onClose: () => void;
  onRetry: () => void;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function ShareDocDetailPanel({
  fallbackDoc,
  doc,
  status,
  onClose,
  onRetry,
}: Props) {
  const title = doc?.title ?? fallbackDoc.title;
  const createdAt = doc?.created_at ?? fallbackDoc.created_at;
  const titleId = `share-doc-panel-title-${fallbackDoc.doc_id}`;

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="flex h-full w-full max-w-xl flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="flex items-start justify-between gap-4 border-b border-toss-gray-100 px-6 py-5">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-toss-blue">
              <FileText className="h-4 w-4 shrink-0" />
              <span>ShareBox 문서</span>
            </div>
            <h2
              id={titleId}
              className="break-words text-xl font-bold text-toss-gray-900"
            >
              {title}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-toss-gray-500">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDate(createdAt)}
              </span>
              {doc && (
                <span className="flex items-center gap-1">
                  <UserRound className="h-3.5 w-3.5" />
                  {doc.author}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-toss-gray-500 hover:bg-toss-gray-100"
            aria-label="문서 닫기"
            title="문서 닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {status === "loading" && (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 text-sm text-toss-gray-500">
              <Loader2 className="h-6 w-6 animate-spin text-toss-blue" />
              문서 내용을 불러오는 중...
            </div>
          )}

          {status === "error" && (
            <div className="rounded-lg border border-red-100 bg-red-50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-red-600">
                <AlertCircle className="h-4 w-4" />
                문서를 불러오지 못했어요
              </div>
              <p className="mb-4 text-sm text-red-500">
                ShareBox 상세 문서 요청이 실패했어요. 잠시 후 다시 시도해 주세요.
              </p>
              <button
                type="button"
                onClick={onRetry}
                className="h-9 rounded-lg bg-white px-3 text-sm font-medium text-red-600 hover:bg-red-100"
              >
                다시 불러오기
              </button>
            </div>
          )}

          {status === "success" && doc && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded px-2 py-1 text-xs font-medium ${docCategoryColor[doc.category]}`}
                >
                  {docCategoryLabel[doc.category]}
                </span>
                <span className="rounded bg-toss-gray-50 px-2 py-1 text-xs font-medium text-toss-gray-500">
                  {doc.indexed ? "검색 인덱싱 완료" : "검색 인덱싱 대기"}
                </span>
              </div>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-toss-gray-800">
                  미리보기
                </h3>
                <p className="rounded-lg bg-toss-gray-25 p-4 text-sm leading-6 text-toss-gray-600">
                  {doc.preview}
                </p>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-toss-gray-800">
                  본문
                </h3>
                <div className="whitespace-pre-wrap break-words rounded-lg border border-toss-gray-100 p-4 text-sm leading-7 text-toss-gray-700">
                  {doc.full_content}
                </div>
              </section>

              {doc.tags.length > 0 && (
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-toss-gray-800">
                    <Tag className="h-4 w-4" />
                    태그
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {doc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-toss-gray-50 px-2 py-1 text-xs text-toss-gray-600"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
