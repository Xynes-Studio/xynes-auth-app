import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

describe("GET /api/picture-of-the-day", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    delete process.env.PEXELS_API_KEY;
  });

  it("returns 503 when PEXELS_API_KEY is missing", async () => {
    const { GET } = await import("./route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.error).toBe("Picture of the day unavailable");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns sanitized picture payload from pexels", async () => {
    process.env.PEXELS_API_KEY = "server-key";
    vi.spyOn(Date, "now").mockReturnValue(0);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        photos: [
          {
            id: 42,
            alt: "Golden hour cliffs",
            url: "https://www.pexels.com/photo/golden-hour-cliffs-42/",
            photographer: "Alex Doe",
            photographer_url: "https://www.pexels.com/@alex-doe",
            src: {
              large2x: "https://images.pexels.com/photos/42/pexels-photo-42.jpeg",
            },
          },
        ],
      }),
    });

    const { GET } = await import("./route");

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("api.pexels.com/v1/curated"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "server-key" }),
      }),
    );
    expect(payload.picture).toEqual({
      id: 42,
      alt: "Golden hour cliffs",
      imageUrl: "https://images.pexels.com/photos/42/pexels-photo-42.jpeg",
      photographerName: "Alex Doe",
      photographerProfileUrl: "https://www.pexels.com/@alex-doe",
      pexelsPhotoUrl: "https://images.pexels.com/photos/42/pexels-photo-42.jpeg",
    });
  });

  it("serves from server cache for 8 hours without refetching", async () => {
    process.env.PEXELS_API_KEY = "server-key";
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1000)
      .mockReturnValueOnce(1000 + 100);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        photos: [
          {
            id: 77,
            alt: "Cached server side",
            url: "https://www.pexels.com/photo/cached-server-side-77/",
            photographer: "Server Cache",
            photographer_url: "https://www.pexels.com/@server-cache",
            src: {
              original: "https://images.pexels.com/photos/77/pexels-photo-77.jpeg",
            },
          },
        ],
      }),
    });

    const { GET } = await import("./route");

    const first = await GET();
    const second = await GET();

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.headers.get("X-POTD-Cache")).toBe("MISS");
    expect(second.headers.get("X-POTD-Cache")).toBe("HIT");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
