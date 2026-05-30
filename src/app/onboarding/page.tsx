import { Metadata } from "next";
import { OnboardingScreen } from "@/components/onboarding";

export const metadata: Metadata = {
  title: "Create Workspace | Xynes",
  description:
    "Create your first Xynes workspace.",
};

/**
 * Onboarding Page (RSC)
 *
 * Displayed to authenticated users who have no workspaces yet. The route is
 * intentionally minimal: it handles the `?redirect=<url>` server-side query
 * parameter and forwards control to `<OnboardingScreen>`, which is a client
 * component so it can resolve copy through `next-intl` and reuse Lumia DS
 * form primitives.
 *
 * WSA-FIX-2 (2026-05-12): Reads the optional `?redirect=<url>` search param
 * and forwards it to `<OnboardingScreen>`, which in turn forwards it to
 * `<CreateWorkspaceForm>` as `redirectUrl`. CreateWorkspaceForm validates the
 * value against `getAllowedRedirectDomains()` — open-redirect protection is
 * unchanged.
 *
 * BUG-AUTH-1 (2026-05-30): Visible copy + visual chrome moved to
 * `<OnboardingScreen>` (client) so it can pseudo-localize (en-XA) through the
 * `auth.onboarding` namespace and reuse Lumia DS `Flex`. The marketing hero
 * block (gradient background, oversized X icon, "Welcome to Xynes" sentence)
 * has been retired in favour of a single tight page header.
 *
 * Next.js 15: `searchParams` is asynchronous on RSCs and must be awaited
 * before its properties are read.
 */
type OnboardingSearchParams = Record<string, string | string[] | undefined>;

function pickRedirectParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    const first = value.find(
      (entry) => typeof entry === "string" && entry.trim() !== "",
    );
    return first?.trim() || undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return undefined;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<OnboardingSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const redirectUrl = pickRedirectParam(resolvedSearchParams.redirect);

  return <OnboardingScreen redirectUrl={redirectUrl} />;
}
