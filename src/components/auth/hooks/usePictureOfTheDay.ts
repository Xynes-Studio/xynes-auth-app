"use client";

import { useEffect, useState } from "react";
import {
  PICTURE_OF_THE_DAY_CACHE_KEY,
  createPictureOfTheDayCacheEntry,
  isPictureOfTheDayData,
  isSafeExternalUrl,
  readPictureOfTheDayCache,
  type PictureOfTheDayData,
} from "@/lib/picture-of-the-day";

type PictureResponse = {
  picture?: PictureOfTheDayData;
};

const PICTURE_OF_THE_DAY_ENDPOINT = "/api/picture-of-the-day?v=3";

function getCachedPicture(): PictureOfTheDayData | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return readPictureOfTheDayCache(
      window.localStorage.getItem(PICTURE_OF_THE_DAY_CACHE_KEY),
    );
  } catch {
    return null;
  }
}

function persistPicture(picture: PictureOfTheDayData) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const entry = createPictureOfTheDayCacheEntry(picture);
    window.localStorage.setItem(
      PICTURE_OF_THE_DAY_CACHE_KEY,
      JSON.stringify(entry),
    );
  } catch {
    // Ignore storage failures (private mode, quota limits, etc.).
  }
}

function isSafePicture(picture: PictureOfTheDayData): boolean {
  return (
    isSafeExternalUrl(picture.imageUrl) &&
    isSafeExternalUrl(picture.photographerProfileUrl) &&
    isSafeExternalUrl(picture.pexelsPhotoUrl)
  );
}

export function usePictureOfTheDay() {
  const [picture, setPicture] = useState<PictureOfTheDayData | null>(null);

  useEffect(() => {
    let isMounted = true;

    const cachedPicture = getCachedPicture();
    if (cachedPicture) {
      setPicture(cachedPicture);
    }

    const loadPicture = async () => {
      try {
        const response = await fetch(PICTURE_OF_THE_DAY_ENDPOINT, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as PictureResponse;

        if (!isPictureOfTheDayData(data.picture)) {
          return;
        }

        if (!isSafePicture(data.picture)) {
          return;
        }

        if (!isMounted) {
          return;
        }

        setPicture(data.picture);
        persistPicture(data.picture);
      } catch {
        // Keep cached content on network/API errors.
      }
    };

    void loadPicture();

    return () => {
      isMounted = false;
    };
  }, []);

  return picture;
}
