"use client";

import { useEffect, useState } from "react";
import { Button, Flex, Spinner, Ticker } from "@lumia-ui/components";
import { Icon, getIcon, registerIcon } from "@lumia-ui/icons";
import styles from "./xynesTicker.module.css";
import XynesLogoIcon from "@/icons/local/xynesLogo";
import {
  getCachedHackerNewsItems,
  type HackerNewsItem,
} from "@/lib/hacker-news/ticker-data";

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
        const cachedStories = await getCachedHackerNewsItems({
          signal: controller.signal,
        });
        setItems(cachedStories);
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
    const fallbackDestination = `https://news.ycombinator.com/item?id=${story.id}`;
    let destination = fallbackDestination;

    if (story.url) {
      try {
        const parsed = new URL(story.url);
        if (parsed.protocol === "http:" || parsed.protocol === "https:") {
          destination = parsed.toString();
        }
      } catch {
        destination = fallbackDestination;
      }
    }

    window.open(destination, "_blank", "noopener,noreferrer");
  };

  return (
    <Flex
      className={`${styles.container} bg-slate-50 dark:bg-slate-900 px-4 py-2`}
      align="center"
    >
      <div className={`${styles.logo} mr-2`}>
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
        className={`${styles.ticker} gap-2`}
        alignment="center"
        direction="row"
        speed={30}
        pauseOnHover
      >
        {isLoading ? (
          <Flex className={`${styles.newsTicker} items-center gap-2`}>
            <Spinner size="sm" />
            <span className="text-sm text-muted-foreground">
              Loading Top News...
            </span>
          </Flex>
        ) : items.length > 0 ? (
          <Flex className={`${styles.newsTicker} items-center gap-2`}>
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
