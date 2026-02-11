"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Flex } from "@lumia-ui/components";
import { Icon } from "@lumia-ui/icons";
import {
  FALLBACK_PICTURE_OF_THE_DAY,
  isPictureOfTheDayData,
  type PictureOfTheDayData,
} from "@/lib/picture-of-the-day";
import styles from "./potd.module.css";

type PictureResponse = {
  picture?: PictureOfTheDayData;
};

const PictureOfTheDay = () => {
  const [picture, setPicture] = useState<PictureOfTheDayData>(
    FALLBACK_PICTURE_OF_THE_DAY,
  );

  useEffect(() => {
    const loadPicture = async () => {
      try {
        const response = await fetch("/api/picture-of-the-day?v=3", {
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

        setPicture(data.picture);
      } catch {
        // Keep fallback content on network/API errors.
      }
    };

    void loadPicture();
  }, []);

  const photographerLabel = useMemo(
    () => picture.photographerName.replace(/^@/, ""),
    [picture.photographerName],
  );

  return (
    <Flex direction="col" className={styles.container}>
      <div className={styles.imageFrame}>
        <Image
          src={picture.imageUrl}
          alt={picture.alt || "Picture of the day"}
          width={360}
          height={480}
          className={styles.image}
        />
        <div className={styles.hoverActions}>
          <a
            href={picture.pexelsPhotoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on Pexels"
            className={`${styles.hoverLink} text-slate-50`}
          >
            Pexels
            <Icon
              name="external-link"
              size="sm"
              color="bg-slate-50"
              className={styles.hoverIco}
              aria-hidden="true"
            />
          </a>
        </div>
      </div>

      <h1
        className={`font-title-serif mt-4 ${styles.titleSingleLine}`}
        title={picture.alt}
      >
        {picture.alt}
      </h1>

      <p className={styles.caption}>
        by{" "}
        <a
          href={picture.photographerProfileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.authorLink} ${styles.authorSingleLine}`}
          title={photographerLabel}
        >
          {photographerLabel}
        </a>
      </p>
    </Flex>
  );
};

export default PictureOfTheDay;
