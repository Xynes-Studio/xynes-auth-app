export type HackerNewsItem = {
  id: number;
  title: string;
  url?: string;
};

type StoryRecord = {
  id?: number;
  title?: string;
  url?: string;
};

type GetCachedHackerNewsItemsOptions = {
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  now?: () => number;
};

const HN_TOP_STORIES_URL = "https://hacker-news.firebaseio.com/v0/topstories.json";
const HN_ITEM_URL_PREFIX = "https://hacker-news.firebaseio.com/v0/item/";
const HN_STORY_LIMIT = 10;
const HN_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedItems: HackerNewsItem[] | null = null;
let cachedAtMs = 0;
let inFlightPromise: Promise<HackerNewsItem[]> | null = null;

function isCacheFresh(nowMs: number): boolean {
  return cachedItems !== null && nowMs - cachedAtMs < HN_CACHE_TTL_MS;
}

function toHackerNewsItem(story: StoryRecord | null): HackerNewsItem | null {
  if (!story || typeof story.id !== "number" || !story.title) {
    return null;
  }

  return {
    id: story.id,
    title: story.title,
    url: story.url,
  };
}

async function fetchTopStories(
  fetchImpl: typeof fetch,
  signal?: AbortSignal,
): Promise<HackerNewsItem[]> {
  const topStoriesResponse = await fetchImpl(HN_TOP_STORIES_URL, { signal });
  if (!topStoriesResponse.ok) {
    throw new Error("Failed to load Hacker News stories");
  }

  const topIds = (await topStoriesResponse.json()) as number[];
  const topTen = topIds.slice(0, HN_STORY_LIMIT);

  const storyResponses = await Promise.all(
    topTen.map((id) => fetchImpl(`${HN_ITEM_URL_PREFIX}${id}.json`, { signal })),
  );

  const storyData = await Promise.all(
    storyResponses.map(async (response) => {
      if (!response.ok) return null;
      try {
        return (await response.json()) as StoryRecord;
      } catch {
        return null;
      }
    }),
  );

  return storyData.map(toHackerNewsItem).filter((story): story is HackerNewsItem => Boolean(story));
}

export async function getCachedHackerNewsItems(
  options: GetCachedHackerNewsItemsOptions = {},
): Promise<HackerNewsItem[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const nowMs = now();

  if (isCacheFresh(nowMs)) {
    return cachedItems ?? [];
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = fetchTopStories(fetchImpl, options.signal)
    .then((items) => {
      cachedItems = items;
      cachedAtMs = now();
      return items;
    })
    .finally(() => {
      inFlightPromise = null;
    });

  return inFlightPromise;
}

export function resetHackerNewsTickerCacheForTests(): void {
  cachedItems = null;
  cachedAtMs = 0;
  inFlightPromise = null;
}
