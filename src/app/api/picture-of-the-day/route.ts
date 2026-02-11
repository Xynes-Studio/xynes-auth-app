import { NextResponse } from "next/server";
import {
  FALLBACK_PICTURE_OF_THE_DAY,
  PICTURE_OF_THE_DAY_CACHE_TTL_MS,
  isPictureOfTheDayData,
  isSafeExternalUrl,
  type PictureOfTheDayData,
} from "@/lib/picture-of-the-day";

const PEXELS_CURATED_ENDPOINT =
  "https://api.pexels.com/v1/curated?per_page=40&page=1";

type PexelsPhoto = {
  id?: number;
  alt?: string;
  url?: string;
  photographer?: string;
  photographer_url?: string;
  src?: {
    large2x?: string;
    large?: string;
    original?: string;
  };
};

type PexelsCuratedResponse = {
  photos?: PexelsPhoto[];
};

type ServerCachedPicture = {
  picture: PictureOfTheDayData;
  expiresAt: number;
};

let serverCachedPicture: ServerCachedPicture | null = null;

function selectPictureOfTheDay(
  photos: PexelsPhoto[],
): PictureOfTheDayData | null {
  if (!photos.length) {
    return null;
  }

  const daySeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const selected = photos[daySeed % photos.length];

  const normalizedId = selected.id ?? FALLBACK_PICTURE_OF_THE_DAY.id;

  const normalized: PictureOfTheDayData = {
    id: normalizedId,
    alt: (selected.alt || "Picture of the day").trim(),
    imageUrl:
      selected.src?.large2x ||
      selected.src?.large ||
      selected.src?.original ||
      FALLBACK_PICTURE_OF_THE_DAY.imageUrl,
    photographerName: (
      selected.photographer || FALLBACK_PICTURE_OF_THE_DAY.photographerName
    ).trim(),
    photographerProfileUrl:
      selected.photographer_url ||
      FALLBACK_PICTURE_OF_THE_DAY.photographerProfileUrl,
    pexelsPhotoUrl:
      selected.url ||
      selected.src?.original ||
      selected.src?.large2x ||
      selected.src?.large ||
      FALLBACK_PICTURE_OF_THE_DAY.pexelsPhotoUrl,
  };

  if (!isPictureOfTheDayData(normalized)) {
    return null;
  }

  if (
    !isSafeExternalUrl(normalized.imageUrl) ||
    !isSafeExternalUrl(normalized.photographerProfileUrl) ||
    !isSafeExternalUrl(normalized.pexelsPhotoUrl)
  ) {
    return null;
  }

  return normalized;
}

export async function GET() {
  if (serverCachedPicture && serverCachedPicture.expiresAt > Date.now()) {
    return NextResponse.json(
      { picture: serverCachedPicture.picture },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-POTD-Cache": "HIT",
        },
      },
    );
  }

  const apiKey = process.env.PEXELS_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Picture of the day unavailable" },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(PEXELS_CURATED_ENDPOINT, {
      method: "GET",
      headers: {
        Authorization: apiKey,
      },
      next: {
        revalidate: 8 * 60 * 60,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Picture of the day unavailable" },
        { status: 502 },
      );
    }

    const body = (await response.json()) as PexelsCuratedResponse;
    const picture = selectPictureOfTheDay(body.photos || []);

    if (!picture) {
      return NextResponse.json(
        { error: "Picture of the day unavailable" },
        { status: 502 },
      );
    }

    serverCachedPicture = {
      picture,
      expiresAt: Date.now() + PICTURE_OF_THE_DAY_CACHE_TTL_MS,
    };

    return NextResponse.json(
      { picture },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "X-POTD-Cache": "MISS",
        },
      },
    );
  } catch {
    return NextResponse.json(
      { error: "Picture of the day unavailable" },
      { status: 502 },
    );
  }
}
