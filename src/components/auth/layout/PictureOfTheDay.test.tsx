import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import PictureOfTheDay from "./PictureOfTheDay";
import {
  PICTURE_OF_THE_DAY_CACHE_KEY,
  createPictureOfTheDayCacheEntry,
  readPictureOfTheDayCache,
} from "@/lib/picture-of-the-day";

const mockFetch = vi.fn();

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line jsx-a11y/alt-text, @next/next/no-img-element
    <img {...props} />
  ),
}));

describe("PictureOfTheDay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    window.localStorage.clear();
  });

  it("does not render cached picture during the initial client render", () => {
    const cachedPicture = {
      id: 7,
      alt: "Cached valley",
      imageUrl: "https://images.pexels.com/photos/7/pexels-photo-7.jpeg",
      photographerName: "Cached Author",
      photographerProfileUrl: "https://www.pexels.com/@cached-author",
      pexelsPhotoUrl: "https://images.pexels.com/photos/7/pexels-photo-7.jpeg",
    };

    window.localStorage.setItem(
      PICTURE_OF_THE_DAY_CACHE_KEY,
      JSON.stringify(createPictureOfTheDayCacheEntry(cachedPicture)),
    );

    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => {
      flushSync(() => {
        root.render(<PictureOfTheDay />);
      });
      expect(container).not.toHaveTextContent("Cached Author");
    });

    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it("renders cached picture after hydration and refreshes from server response", async () => {
    const cachedPicture = {
      id: 7,
      alt: "Cached valley",
      imageUrl: "https://images.pexels.com/photos/7/pexels-photo-7.jpeg",
      photographerName: "Cached Author",
      photographerProfileUrl: "https://www.pexels.com/@cached-author",
      pexelsPhotoUrl: "https://images.pexels.com/photos/7/pexels-photo-7.jpeg",
    };

    window.localStorage.setItem(
      PICTURE_OF_THE_DAY_CACHE_KEY,
      JSON.stringify(createPictureOfTheDayCacheEntry(cachedPicture)),
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        picture: {
          id: 1,
          alt: "Updated mountain",
          imageUrl: "https://images.pexels.com/photos/1/pexels-photo-1.jpeg",
          photographerName: "Updated Author",
          photographerProfileUrl: "https://www.pexels.com/@updated-author",
          pexelsPhotoUrl:
            "https://images.pexels.com/photos/1/pexels-photo-1.jpeg",
        },
      }),
    });

    render(<PictureOfTheDay />);

    expect(await screen.findByText("Cached Author")).toBeInTheDocument();
    expect(await screen.findByText("Updated Author")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      const cached = readPictureOfTheDayCache(
        window.localStorage.getItem(PICTURE_OF_THE_DAY_CACHE_KEY),
      );
      expect(cached?.id).toBe(1);
    });
  });

  it("fetches and renders picture when no cache exists", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        picture: {
          id: 9,
          alt: "Fresh image",
          imageUrl: "https://images.pexels.com/photos/9/pexels-photo-9.jpeg",
          photographerName: "Fresh Author",
          photographerProfileUrl: "https://www.pexels.com/@fresh-author",
          pexelsPhotoUrl:
            "https://images.pexels.com/photos/9/pexels-photo-9.jpeg",
        },
      }),
    });

    render(<PictureOfTheDay />);

    expect(await screen.findByText("Fresh Author")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/picture-of-the-day?v=3",
        expect.objectContaining({ method: "GET", cache: "no-store" }),
      );
    });

    expect(
      screen.getByRole("link", { name: /view on pexels/i }),
    ).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: /fresh author/i })).toHaveAttribute(
      "href",
      "https://www.pexels.com/@fresh-author",
    );
  });
});
