import { describe, expect, it } from "vitest";
import {
  FALLBACK_PICTURE_OF_THE_DAY,
  isPictureOfTheDayData,
  isSafeExternalUrl,
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
});
