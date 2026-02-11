export type PictureOfTheDayData = {
  id: number;
  alt: string;
  imageUrl: string;
  photographerName: string;
  photographerProfileUrl: string;
  pexelsPhotoUrl: string;
};
export const PICTURE_OF_THE_DAY_CACHE_TTL_MS = 8 * 60 * 60 * 1000;

export const FALLBACK_PICTURE_OF_THE_DAY: PictureOfTheDayData = {
  id: 17499411,
  alt: "Movement at night",
  imageUrl:
    "https://images.pexels.com/photos/17499411/pexels-photo-17499411.jpeg",
  photographerName: "stencil.pointer",
  photographerProfileUrl: "https://www.pexels.com/@stencil.pointer",
  pexelsPhotoUrl: "https://www.pexels.com/photo/17499411/",
};

export function isPictureOfTheDayData(
  value: unknown,
): value is PictureOfTheDayData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const picture = value as Partial<PictureOfTheDayData>;

  return (
    typeof picture.id === "number" &&
    typeof picture.alt === "string" &&
    typeof picture.imageUrl === "string" &&
    typeof picture.photographerName === "string" &&
    typeof picture.photographerProfileUrl === "string" &&
    typeof picture.pexelsPhotoUrl === "string"
  );
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}
