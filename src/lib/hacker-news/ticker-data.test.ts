import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getCachedHackerNewsItems,
  resetHackerNewsTickerCacheForTests,
  type HackerNewsItem,
} from "./ticker-data";

function createJsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("xynesTickerData", () => {
  beforeEach(() => {
    resetHackerNewsTickerCacheForTests();
  });

  it("reuses cached stories within ttl", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    fetchMock.mockResolvedValueOnce(createJsonResponse([1, 2, 3]));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: 1, title: "Story 1", url: "https://a.test" }),
    );
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: 2, title: "Story 2", url: "https://b.test" }),
    );
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: 3, title: "Story 3", url: "https://c.test" }),
    );

    const first = await getCachedHackerNewsItems({
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 1_000,
    });
    const second = await getCachedHackerNewsItems({
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 1_100,
    });

    expect(first).toHaveLength(3);
    expect(second).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("refetches after ttl expires", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    fetchMock.mockResolvedValueOnce(createJsonResponse([1]));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: 1, title: "Story 1", url: "https://a.test" }),
    );
    fetchMock.mockResolvedValueOnce(createJsonResponse([2]));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: 2, title: "Story 2", url: "https://b.test" }),
    );

    const first = await getCachedHackerNewsItems({
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 10_000,
    });
    const second = await getCachedHackerNewsItems({
      fetchImpl: fetchMock as unknown as typeof fetch,
      now: () => 10_000 + 300_000 + 1,
    });

    expect((first as HackerNewsItem[]).map((item) => item.id)).toEqual([1]);
    expect((second as HackerNewsItem[]).map((item) => item.id)).toEqual([2]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("deduplicates concurrent calls with one in-flight request", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    fetchMock.mockResolvedValueOnce(createJsonResponse([1, 2]));
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: 1, title: "Story 1", url: "https://a.test" }),
    );
    fetchMock.mockResolvedValueOnce(
      createJsonResponse({ id: 2, title: "Story 2", url: "https://b.test" }),
    );

    const [first, second] = await Promise.all([
      getCachedHackerNewsItems({
        fetchImpl: fetchMock as unknown as typeof fetch,
        now: () => 500,
      }),
      getCachedHackerNewsItems({
        fetchImpl: fetchMock as unknown as typeof fetch,
        now: () => 500,
      }),
    ]);

    expect(first).toEqual(second);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
