import { describe, expect, it } from "vitest";
import {
  FALLBACK_PICTURE_OF_THE_DAY,
  PICTURE_OF_THE_DAY_CACHE_TTL_MS,
  createPictureOfTheDayCacheEntry,
  isPictureOfTheDayData,
  isSafeExternalUrl,
  readPictureOfTheDayCache,
} from "./index";

describe("picture-of-the-day utils", () => {
  describe("isPictureOfTheDayData", () => {
    it("returns true for a valid picture payload", () => {
      expect(isPictureOfTheDayData(FALLBACK_PICTURE_OF_THE_DAY)).toBe(true);
    });

    it("returns false for non-object values", () => {
      expect(isPictureOfTheDayData(null)).toBe(false);
      expect(isPictureOfTheDayData("nope")).toBe(false);
    });

    it("returns false when required fields are missing or invalid", () => {
      expect(
        isPictureOfTheDayData({
          id: 1,
          alt: "",
          imageUrl: "https://images.pexels.com/test.jpg",
          photographerName: "",
          photographerProfileUrl: "https://pexels.com/@author",
        }),
      ).toBe(false);

      expect(
        isPictureOfTheDayData({
          id: "1",
          alt: "Alt",
          imageUrl: "https://images.pexels.com/test.jpg",
          photographerName: "Author",
          photographerProfileUrl: "https://pexels.com/@author",
          pexelsPhotoUrl: "https://pexels.com/photo/1",
        }),
      ).toBe(false);
    });
  });

  describe("isSafeExternalUrl", () => {
    it("accepts https URLs", () => {
      expect(isSafeExternalUrl("https://images.pexels.com/photo.jpg")).toBe(
        true,
      );
    });

    it("rejects non-https or malformed URLs", () => {
      expect(isSafeExternalUrl("http://images.pexels.com/photo.jpg")).toBe(
        false,
      );
      expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeExternalUrl("not-a-url")).toBe(false);
    });
  });

  describe("picture-of-the-day cache helpers", () => {
    it("creates a cache entry with ttl", () => {
      const now = 1_700_000_000_000;
      const entry = createPictureOfTheDayCacheEntry(
        FALLBACK_PICTURE_OF_THE_DAY,
        now,
      );

      expect(entry.picture).toEqual(FALLBACK_PICTURE_OF_THE_DAY);
      expect(entry.expiresAt).toBe(now + PICTURE_OF_THE_DAY_CACHE_TTL_MS);
    });

    it("returns null for invalid or expired cache payloads", () => {
      expect(readPictureOfTheDayCache(null)).toBeNull();

      const expired = JSON.stringify({
        picture: FALLBACK_PICTURE_OF_THE_DAY,
        expiresAt: 1,
      });

      expect(readPictureOfTheDayCache(expired, 2)).toBeNull();
      expect(readPictureOfTheDayCache("{not-json}")).toBeNull();
      expect(
        readPictureOfTheDayCache(
          JSON.stringify({
            picture: { ...FALLBACK_PICTURE_OF_THE_DAY, imageUrl: "http://bad" },
            expiresAt: Date.now() + 1000,
          }),
        ),
      ).toBeNull();
    });

    it("returns cached picture when payload is valid", () => {
      const now = Date.now();
      const entry = JSON.stringify({
        picture: FALLBACK_PICTURE_OF_THE_DAY,
        expiresAt: now + 1000,
      });

      expect(readPictureOfTheDayCache(entry, now)).toEqual(
        FALLBACK_PICTURE_OF_THE_DAY,
      );
    });
  });
});
