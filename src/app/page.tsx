import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAllowedRedirectDomains, getSafeRedirectUrl } from "@/lib/redirect";
import { LandingScreen } from "@/components/landing/LandingScreen";
import {
  AUTH_LOCALE_COOKIE,
  getAuthMessages,
  resolveAuthLocale,
} from "@/i18n/config";

/**
 * Localized `<head>` metadata for the LP-AUTH landing page.
 *
 * Reuses the same locale-resolution path the app's root layout already runs
 * (`AUTH_LOCALE_COOKIE` + `accept-language` → `resolveAuthLocale` →
 * `getAuthMessages`) so the resolved metadata locale ALWAYS matches the
 * locale rendered inside `<LandingScreen>`. Hostile / unsupported locale
 * inputs collapse to `en-US` via `negotiateLocale`'s fail-closed branch — no
 * unvalidated string drives this code path.
 *
 * Returning `Metadata` from `generateMetadata` is documented as Next.js's
 * canonical way to localize `<title>` + `<meta name="description">` per
 * request without flipping the page to a client component.
 */
export async function generateMetadata(): Promise<Metadata> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const locale = resolveAuthLocale({
    cookieLocale: cookieStore.get(AUTH_LOCALE_COOKIE)?.value,
    acceptLanguage: headerList.get("accept-language"),
  });
  const messages = getAuthMessages(locale);
  return {
    title: messages.auth.landing.meta.title,
    description: messages.auth.landing.meta.description,
  };
}

/**
 * Public landing page (LP-AUTH).
 *
 * Reachable at `https://auth.xynes.com/`. Replaces the prior `/` → `/login`
 * server redirect with a real splash screen rendered by `<LandingScreen>`.
 *
 * Server-side behavior:
 *
 *   1. If the visitor is already authenticated (Supabase session present),
 *      they are immediately redirected to `/dashboard/apps` — OR to the
 *      validated `?redirect=` query param when supplied. This preserves the
 *      pre-LP-AUTH bookmark behavior: an authenticated user who hits `/`
 *      lands on their dashboard.
 *
 *   2. Anonymous visitors see `<LandingScreen>`. The validated `?redirect=`
 *      query (if any) is forwarded into BOTH the sign-in AND sign-up CTAs as
 *      `?redirect=<encoded>` so a returning visitor's intended destination
 *      survives the auth handshake. When no explicit redirect is supplied,
 *      the CTAs go to bare `/login` / `/signup` and the auth pages apply
 *      their own default destination (`/dashboard/apps`) — appending the
 *      default explicitly would trip the login redirect-loop guard.
 *
 *   3. Hostile or unallowlisted `?redirect=` values fail closed to
 *      `/dashboard/apps` — same posture as `getSafeRedirectUrl` everywhere
 *      else in the app.
 *
 * Why server-side and not middleware:
 *   - The middleware in `src/middleware.ts` does NOT enforce auth on `/`
 *     (it is public). It only sets CSRF + CSP headers.
 *   - The auth check is intentionally a server-component side effect so
 *     `<LandingScreen>` never renders for authenticated users (screen-reader
 *     announcements never fire a partial page before the redirect).
 *
 * Why not move the check into `<LandingScreen>` (client component):
 *   - Would render a flash of marketing copy before the client hydration
 *     finishes and the redirect runs. We want the redirect to feel like the
 *     pre-LP-AUTH 302.
 *
 * @see `xynes-front-end/infra/docs/plans/2026-06-04-landing-page-template/02-xynes-auth-app-landing.md`
 */
type LandingSearchParams = Record<string, string | string[] | undefined>;

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

/** Default post-sign-in destination. Matches `docs/DEVELOPER.md` auth routing. */
const DEFAULT_POST_AUTH_DESTINATION = "/dashboard/apps";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<LandingSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const rawRedirect = pickRedirectParam(resolvedSearchParams.redirect);

  // Always evaluate against the allowlist. `getSafeRedirectUrl` returns the
  // default when the input is missing / malformed / cross-origin, so we
  // never propagate an attacker-controlled string downstream.
  const allowedDomains = getAllowedRedirectDomains();
  const safeRedirect = rawRedirect
    ? getSafeRedirectUrl(
        rawRedirect,
        DEFAULT_POST_AUTH_DESTINATION,
        allowedDomains,
      )
    : DEFAULT_POST_AUTH_DESTINATION;
  // `redirectIsExplicit` is true ONLY when the visitor supplied an
  // allowlisted redirect that resolves to a non-default destination. We use
  // it to decide whether the sign-in / sign-up CTAs should carry the
  // `?redirect=` query — when the resolved value is the documented default
  // (`/dashboard/apps`), appending the query is a no-op for the auth pages
  // and would trip the login redirect-loop guard.
  const redirectIsExplicit =
    rawRedirect !== undefined && safeRedirect !== DEFAULT_POST_AUTH_DESTINATION;

  // Server-side auth check. When a session exists, skip the landing splash
  // and send the visitor straight to their dashboard (or to the validated
  // redirect target).
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(safeRedirect);
  }

  return (
    <LandingScreen
      postAuthRedirect={safeRedirect}
      redirectIsExplicit={redirectIsExplicit}
    />
  );
}
