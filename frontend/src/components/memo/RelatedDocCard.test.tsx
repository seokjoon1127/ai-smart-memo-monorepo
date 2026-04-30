import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RelatedDoc, ShareDocDetail } from "@/types/api";

vi.mock("@/services", () => ({
  shareBoxApi: {
    getDetail: vi.fn(),
  },
}));

import { shareBoxApi } from "@/services";
import { RelatedDocCard } from "./RelatedDocCard";

const relatedDoc: RelatedDoc = {
  doc_id: "doc_001",
  title: "김팀장 회의록",
  preview: "회의 아젠다와 결정 사항",
  relevance_score: 0.91,
  created_at: "2026-04-30T10:00:00+09:00",
};

const detail: ShareDocDetail = {
  id: "doc_001",
  title: "김팀장 회의록",
  category: "meeting",
  author: "박석준",
  preview: "회의 아젠다와 결정 사항",
  tags: ["회의", "김팀장"],
  created_at: "2026-04-30T10:00:00+09:00",
  indexed: true,
  full_content: "회의 본문 전체 내용입니다.",
};

describe("RelatedDocCard", () => {
  it("click opens the ShareBox document detail panel", async () => {
    vi.mocked(shareBoxApi.getDetail).mockResolvedValue(detail);

    render(<RelatedDocCard doc={relatedDoc} />);

    await userEvent.click(
      screen.getByRole("button", { name: /김팀장 회의록/i }),
    );

    expect(shareBoxApi.getDetail).toHaveBeenCalledWith("doc_001");
    expect(
      await screen.findByRole("heading", { name: "김팀장 회의록" }),
    ).toBeInTheDocument();
    expect(screen.getByText("회의 본문 전체 내용입니다.")).toBeInTheDocument();
  });
});
