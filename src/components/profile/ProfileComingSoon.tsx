"use client";

/**
 * ProfileComingSoon
 *
 * Polished "Coming soon" placeholder for /profile (BUG-AUTH-3a). Mounted
 * inside `AuthDashboardShell` so the sidebar, scroll containment, and
 * workspace context all match the rest of the dashboard. The route exists
 * because the avatar menu's "Profile" action targets it; the real
 * self-service editor is a future story.
 *
 * Visible copy resolves through `useTranslations("auth.profile")` so the
 * surface pseudo-localises (en-XA) and stays catalog-owned.
 */

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Badge, Card, Flex } from "@lumia-ui/components";

export function ProfileComingSoon() {
  const t = useTranslations("auth.profile");

  return (
    <Flex
      direction="col"
      align="center"
      justify="center"
      gap="lg"
      className="min-h-[420px] w-full px-4 py-8 sm:px-6"
    >
      <header className="w-full max-w-2xl text-center">
        <h1 className="text-balance text-2xl font-semibold text-foreground sm:text-3xl">
          {t("page.title")}
        </h1>
        <p className="mt-2 text-pretty text-sm text-foreground/70">
          {t("page.subtitle")}
        </p>
      </header>

      <Card className="w-full max-w-2xl p-6 sm:p-8">
        <Flex direction="col" align="center" gap="md" className="text-center">
          <Badge variant="subtle">{t("comingSoon.badge")}</Badge>
          <h2 className="text-balance text-lg font-semibold text-foreground sm:text-xl">
            {t("comingSoon.heading")}
          </h2>
          <p className="text-pretty text-sm text-foreground/70">
            {t("comingSoon.body")}
          </p>
          <Flex
            align="center"
            justify="center"
            gap="sm"
            wrap="wrap"
            className="pt-2"
          >
            <a
              href="mailto:support@xynes.com"
              className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {t("comingSoon.supportLabel")}
            </a>
            <span aria-hidden="true" className="text-foreground/40">
              ·
            </span>
            <Link
              href="/dashboard/apps"
              className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {t("comingSoon.backLabel")}
            </Link>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}

export default ProfileComingSoon;
