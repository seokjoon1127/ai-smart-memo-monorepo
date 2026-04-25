import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ShareDoc } from "@/types/api";

vi.mock("@/services", () => ({
  shareBoxApi: {
    list: vi.fn(),
    create: vi.fn(),
    getDetail: vi.fn(),
  },
}));

import { useShareBoxStore } from "./shareBoxStore";
import { shareBoxApi } from "@/services";

const sampleDoc: ShareDoc = {
  id: "doc_001",
  title: "test",
  category: "meeting",
  author: "tester",
  preview: "preview",
  tags: [],
  created_at: "2026-04-25T10:00:00+09:00",
  indexed: true,
};

beforeEach(() => {
  useShareBoxStore.getState().reset();
  vi.clearAllMocks();
});

describe("shareBoxStore — setters", () => {
  it("setQuery updates query", () => {
    useShareBoxStore.getState().setQuery("김팀장");
    expect(useShareBoxStore.getState().query).toBe("김팀장");
  });

  it("setCategory updates category", () => {
    useShareBoxStore.getState().setCategory("meeting");
    expect(useShareBoxStore.getState().category).toBe("meeting");
  });
});

describe("shareBoxStore.fetch", () => {
  it("성공: items 채움, status idle", async () => {
    vi.mocked(shareBoxApi.list).mockResolvedValue({
      items: [sampleDoc],
      total: 1,
      limit: 20,
      offset: 0,
    });

    await useShareBoxStore.getState().fetch();
    const state = useShareBoxStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.total).toBe(1);
    expect(state.status).toBe("idle");
  });

  it("query/category를 호출 인자로 전달", async () => {
    vi.mocked(shareBoxApi.list).mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0,
    });
    useShareBoxStore.setState({ query: "김팀장", category: "meeting" });
    await useShareBoxStore.getState().fetch();

    expect(shareBoxApi.list).toHaveBeenCalledWith({
      q: "김팀장",
      category: "meeting",
    });
  });

  it("실패: status → error, errorMessage 설정", async () => {
    vi.mocked(shareBoxApi.list).mockRejectedValue({
      error: { code: "INTERNAL_ERROR", message: "조회 실패" },
    });

    await useShareBoxStore.getState().fetch();
    const state = useShareBoxStore.getState();
    expect(state.status).toBe("error");
    expect(state.errorMessage).toBe("조회 실패");
  });
});
