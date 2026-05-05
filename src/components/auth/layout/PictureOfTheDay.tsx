"use client";

import { useMemo } from "react";
import Image from "next/image";
import { Flex } from "@lumia-ui/components";
import { Icon } from "@lumia-ui/icons";
import { usePictureOfTheDay } from "../hooks/usePictureOfTheDay";
import styles from "./potd.module.css";

const PictureOfTheDay = () => {
  const picture = usePictureOfTheDay();

  const photographerLabel = useMemo(
    () => (picture ? picture.photographerName.replace(/^@/, "") : ""),
    [picture],
  );

  if (!picture) {
    return null;
  }

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
              className={styles.hoverIcon}
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
