"use client";

import { useEffect, useState } from "react";
import { Button, cn, Flex, Spinner, Ticker } from "@lumia-ui/components";
import { Icon, getIcon, registerIcon } from "@lumia-ui/icons";
import styles from "./xynesTicker.module.css";
import XynesLogoIcon from "@/icons/local/xynesLogo";

type HackerNewsItem = {
  id: number;
  title: string;
  url?: string;
};

if (!getIcon("xynes-logo")) {
  registerIcon("xynes-logo", XynesLogoIcon);
}

const XynesTicker = () => {
  const [items, setItems] = useState<HackerNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const loadTopStories = async () => {
      try {
        setIsLoading(true);
        const topStoriesResponse = await fetch(
          "https://hacker-news.firebaseio.com/v0/topstories.json",
          { signal: controller.signal },
        );
        if (!topStoriesResponse.ok) {
          throw new Error("Failed to load Hacker News stories");
        }

        const topIds = (await topStoriesResponse.json()) as number[];
        const topTen = topIds.slice(0, 10);

        const storyResponses = await Promise.all(
          topTen.map((id) =>
            fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, {
              signal: controller.signal,
            }),
          ),
        );

        const storyData = await Promise.all(
          storyResponses.map((response) => response.json()),
        );

        const normalized = storyData
          .filter((story) => story && story.title)
          .map((story) => ({
            id: story.id as number,
            title: story.title as string,
            url: story.url as string | undefined,
          }));

        setItems(normalized);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setItems([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    loadTopStories();

    return () => controller.abort();
  }, []);

  const handleOpenStory = (story: HackerNewsItem) => {
    const destination = story.url
      ? story.url
      : `https://news.ycombinator.com/item?id=${story.id}`;
    window.open(destination, "_blank", "noopener,noreferrer");
  };

  return (
    <Flex
      className={cn(
        "bg-slate-50 dark:bg-slate-900 px-4 py-2",
        styles.container,
      )}
      align="center"
    >
      <div className={cn(styles.logo, "mr-2")}>
        <Icon
          name="xynes-logo"
          width={69}
          height={32}
          role="img"
          aria-label="Xynes"
          aria-hidden={false}
        />
      </div>

      <Ticker
        className={cn(styles.ticker, "gap-2")}
        alignment="center"
        direction="row"
        speed={30}
        pauseOnHover
      >
        {isLoading ? (
          <Flex className={cn(styles.newsTicker, "items-center gap-2")}>
            <Spinner size="sm" />
            <span className="text-sm text-muted-foreground">
              Loading Top News...
            </span>
          </Flex>
        ) : items.length > 0 ? (
          <Flex className={cn(styles.newsTicker, "items-center gap-2")}>
            {items.map((story) => (
              <Button
                key={story.id}
                variant="ghost"
                size="sm"
                onClick={() => handleOpenStory(story)}
              >
                {story.title}
              </Button>
            ))}
          </Flex>
        ) : (
          <span className="text-sm text-muted-foreground">
            Unable to load Top News.
          </span>
        )}
      </Ticker>
      <Button variant="ghost">Need Help?</Button>
    </Flex>
  );
};
export default XynesTicker;
