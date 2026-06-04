"use client";

import { useTranslations } from "next-intl";
import { Icon } from "@lumia-ui/icons";
import {
  CookieDisclosure,
  MarketingFeatureCard,
  MarketingFeatureGrid,
  MarketingFooter,
  MarketingHero,
  MarketingNav,
  MarketingTrustStrip,
} from "@lumia-ui/marketing";
import { Flex } from "@lumia-ui/components";

import {
  LANDING_BRAND_HREF,
  LANDING_COOKIE_POLICY_URL,
  LANDING_FEATURES,
  LANDING_INTERNAL_LINKS,
  LANDING_TRUST,
  buildFooterColumns,
} from "@/lib/landing-copy";

/**
 * LP-AUTH landing screen.
 *
 * Rendered by `app/page.tsx` (RSC) when the visitor is not already
 * authenticated. The page itself is a one-screen vertical scroll using the
 * Lumia DS marketing primitives: nav, hero, feature grid, trust strip,
 * footer, and a non-blocking cookie disclosure.
 *
 * Routing contract:
 *   - Primary + secondary CTAs land on `/login` and `/signup`. The signup
 *     destination carries `?redirect=/dashboard/apps` by default so a
 *     brand-new account lands in the workspace dashboard after sign-up
 *     (matches the post-login destination rules in `docs/DEVELOPER.md`).
 *   - When the visitor arrives with an explicit `?redirect=<url>` on `/`
 *     itself, the RSC has already validated it via `getAllowedRedirectDomains`
 *     and forwards the validated value here so the CTAs preserve the intent.
 *
 * @param postAuthRedirect — Validated `?redirect=<url>` value (or
 *   `/dashboard/apps` if none was supplied). Always already-safe — the RSC has
 *   run it through `getSafeRedirectUrl` against the allowed-domain allowlist
 *   before passing it down.
 * @param redirectIsExplicit — `true` when the visitor supplied an allowlisted
 *   `?redirect=<url>` on `/` itself (we forward it to BOTH `/login` and
 *   `/signup` CTAs so the cross-app deep link survives the auth handshake).
 *   `false` when `postAuthRedirect` is the default `/dashboard/apps` (we omit
 *   the `?redirect=` query so the login + signup pages use their own default
 *   destination without an extra param, which keeps the login redirect-loop
 *   guard from triggering on `?redirect=/dashboard/apps`).
 */
export type LandingScreenProps = Readonly<{
  postAuthRedirect: string;
  redirectIsExplicit: boolean;
}>;

const FEATURE_ICON_SIZE_PX = 28;

/**
 * Compose an auth handshake URL. Only attaches a `redirect=` query when the
 * caller had an explicit deep link — appending the default destination would
 * pollute the URL with no behavioural difference (auth pages already default
 * to `/dashboard/apps`) and could trip the login redirect-loop guard.
 */
function withRedirectQuery(
  authPath: string,
  redirect: string,
  isExplicit: boolean,
): string {
  if (!isExplicit) return authPath;
  return `${authPath}?redirect=${encodeURIComponent(redirect)}`;
}

export function LandingScreen({
  postAuthRedirect,
  redirectIsExplicit,
}: LandingScreenProps) {
  const t = useTranslations("auth.landing");

  const loginHref = withRedirectQuery(
    LANDING_INTERNAL_LINKS.login,
    postAuthRedirect,
    redirectIsExplicit,
  );
  const signupHref = withRedirectQuery(
    LANDING_INTERNAL_LINKS.signup,
    postAuthRedirect,
    redirectIsExplicit,
  );

  return (
    <Flex direction="col" className="min-h-dvh w-full bg-background">
      <MarketingNav
        brand={{
          variant: "icon",
          size: "sm",
          href: LANDING_BRAND_HREF,
          label: t("nav.brandLabel"),
        }}
        actions={[
          {
            id: "nav-signin",
            label: t("nav.signIn"),
            href: loginHref,
            variant: "ghost",
          },
          {
            id: "nav-signup",
            label: t("nav.signUp"),
            href: signupHref,
            variant: "primary",
          },
        ]}
        aria-label={t("nav.ariaLabel")}
      />

      <main className="flex-1">
        <MarketingHero
          headline={t("hero.headline")}
          subhead={t("hero.subhead")}
          primaryCta={{
            id: "hero-signin",
            label: t("hero.primaryCta"),
            href: loginHref,
            variant: "primary",
          }}
          secondaryCta={{
            id: "hero-signup",
            label: t("hero.secondaryCta"),
            href: signupHref,
            variant: "ghost",
          }}
          footnote={
            <span data-testid="landing-hero-footnote">
              {t("hero.footnote")}
            </span>
          }
          aria-label={t("hero.ariaLabel")}
        />

        <MarketingFeatureGrid
          columns={3}
          aria-label={t("features.ariaLabel")}
          data-testid="landing-feature-grid"
        >
          {LANDING_FEATURES.map((feature) => (
            <MarketingFeatureCard
              key={feature.key}
              icon={
                <Icon
                  name={feature.icon}
                  size={FEATURE_ICON_SIZE_PX}
                  aria-hidden
                />
              }
              headline={t(feature.headlineKey)}
              data-testid={`landing-feature-${feature.key}`}
            >
              {t(feature.bodyKey)}
            </MarketingFeatureCard>
          ))}
        </MarketingFeatureGrid>

        <MarketingTrustStrip
          repoUrl={LANDING_TRUST.repoUrl}
          license={LANDING_TRUST.license}
          securityUrl={LANDING_TRUST.securityUrl}
          residencyNote={t("trust.residency")}
          aria-label={t("trust.ariaLabel")}
        />
      </main>

      <MarketingFooter
        columns={buildFooterColumns(t)}
        copyright={t("footer.copyright")}
        aria-label={t("footer.ariaLabel")}
      />

      <CookieDisclosure
        policyUrl={LANDING_COOKIE_POLICY_URL}
        message={t("cookie.message")}
        policyLabel={t("cookie.policyLabel")}
        dismissLabel={t("cookie.dismissLabel")}
      />
    </Flex>
  );
}
