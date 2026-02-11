import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ImgHTMLAttributes } from "react";
import PictureOfTheDay from "./PictureOfTheDay";

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
  });

  it("renders fallback first and then updates from server response", async () => {
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

    expect(screen.getByText("Movement at night")).toBeInTheDocument();
    expect(await screen.findByText("Updated Author")).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("fetches and renders fresh picture when cache is stale", async () => {
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
