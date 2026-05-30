"use client";

/**
 * OnboardingScreen Component
 *
 * Client component that renders the visible /onboarding page surface: a
 * single Lumia DS card flanked by a tight page header and a help footer. All
 * user-visible copy is resolved through `useTranslations("auth.onboarding")`
 * so it pseudo-localizes (en-XA) and stays catalog-owned.
 *
 * Visual streamlining (BUG-AUTH-1, 2026-05-30):
 *   - Drops the marketing hero block (gradient background, oversized X icon,
 *     "Welcome to Xynes" + long subtitle) for a single tight page header that
 *     matches the visual register of /login + /signup.
 *   - The form card itself no longer carries a redundant icon/subtitle of
 *     its own — the page header is the only header now.
 *   - Spacing + container width align with `AuthSplitLayout`'s right pane
 *     so the route reads as the same family as /login + /signup without
 *     coupling to the split layout (the new-user-first-workspace step is a
 *     full-width transactional surface, not a marketing-paired login).
 *
 * @module onboarding/OnboardingScreen
 */

import { Flex } from "@lumia-ui/components";
import { useTranslations } from "next-intl";
import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

export interface OnboardingScreenProps {
  /**
   * Optional `?redirect=<url>` value forwarded from the server component.
   * `CreateWorkspaceForm` validates this against
   * `getAllowedRedirectDomains()` before honouring it (WSA-FIX-2 contract).
   */
  redirectUrl?: string;
}

export function OnboardingScreen({ redirectUrl }: OnboardingScreenProps) {
  const t = useTranslations("auth.onboarding");

  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-background px-4 py-12 sm:px-6">
      <Flex direction="col" align="center" gap="lg" className="w-full max-w-lg">
        <header className="text-center">
          <h1 className="text-balance text-2xl font-semibold text-foreground sm:text-3xl">
            {t("page.title")}
          </h1>
          <p className="mt-2 text-pretty text-sm text-foreground/70">
            {t("page.subtitle")}
          </p>
        </header>

        <CreateWorkspaceForm redirectUrl={redirectUrl} />

        <footer className="text-center text-xs text-foreground/70">
          <Flex align="center" justify="center" gap="xs" wrap="wrap" inline>
            <span>{t("footer.prompt")}</span>
            <a
              href="https://docs.xynes.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {t("footer.docsLabel")}
              <span className="sr-only"> (opens in new tab)</span>
            </a>
            <span aria-hidden="true">{t("footer.separator")}</span>
            <a
              href="mailto:support@xynes.com"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              {t("footer.supportLabel")}
            </a>
          </Flex>
        </footer>
      </Flex>
    </main>
  );
}

export default OnboardingScreen;
