"use client";

import { type ComponentProps } from "react";
import { Flex } from "@lumia-ui/components";
import PictureOfTheDay from "./PictureOfTheDay";
import XynesTicker from "./XynesTicker";
import styles from "./authSplitLayout.module.css";

type FlexChildren = ComponentProps<typeof Flex>["children"];

interface AuthSplitLayoutProps {
  children: FlexChildren;
}

export function AuthSplitLayout({ children }: AuthSplitLayoutProps) {
  return (
    <Flex className={styles.container} data-testid="auth-split-layout">
      <Flex
        className={`${styles.leftPanel} accent-bg`}
        align="center"
        justify="center"
      >
        <PictureOfTheDay />
      </Flex>
      <Flex
        direction="col"
        className={`${styles.rightPanel} bg-slate-50 dark:bg-slate-900`}
        align="center"
        justify="center"
      >
        <div className={styles.tickerContainer}>
          <XynesTicker />
        </div>
        <Flex direction="col" className={`${styles.formSection} gap-6`}>
          {children}
        </Flex>
      </Flex>
    </Flex>
  );
}
