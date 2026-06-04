/**
 * LP-AUTH landing-page structural copy + URL contracts.
 *
 * The Lumia DS marketing primitives accept localized strings as runtime
 * props. The localized strings come from `auth.landing.*` via `next-intl`.
 * This module owns the OTHER half of the copy contract:
 *
 *   - The icon ids picked from `@lumia-ui/icons`.
 *   - The internal + external URLs each CTA / footer link points at.
 *   - The OSS repo + license + residency host targets used by the trust strip.
 *
 * Keeping this data out of JSX (and out of catalogs — translators MUST NOT
 * accidentally rewrite URLs) means a non-engineer can update copy in
 * `messages/en-US/auth.landing.json` + `docs/marketing-copy.md` without
 * touching the structural wiring, and an engineer can update structural
 * wiring without forcing a catalog refresh.
 *
 * Companion docs:
 *   - `docs/marketing-copy.md` — the human-editable source of truth.
 *   - `messages/en-US/auth.landing.json` — the runtime catalog.
 *   - `messages/en-US/auth.landing.meta.json` — translator metadata sidecar.
 */

import type {
  MarketingFooterColumn,
  MarketingLicense,
} from "@lumia-ui/marketing";

/** Icon ids consumed by `@lumia-ui/icons`'s registered set. */
export type LandingFeatureIcon = "shield-check" | "globe" | "code";

/**
 * Structural data for the three feature cards. The visible label / body
 * strings come from `auth.landing.features.<key>.*` at runtime.
 */
export type LandingFeatureKey = "workspaceScoped" | "sso" | "openSource";

export type LandingFeatureSpec = Readonly<{
  key: LandingFeatureKey;
  /** i18n key path under `auth.landing.features.<key>`. */
  headlineKey: `features.${LandingFeatureKey}.headline`;
  bodyKey: `features.${LandingFeatureKey}.body`;
  icon: LandingFeatureIcon;
}>;

/**
 * Trust-strip targets. The OSS host allowlist lives inside `@lumia-ui/marketing`'s
 * `isAllowedOssRepoUrl` — passing a non-allowed URL here silently omits the
 * "Source code" chip rather than rendering an unsafe link.
 */
export type LandingTrustSpec = Readonly<{
  repoUrl: string;
  license: MarketingLicense;
  /** Relative URL served by `public/SECURITY.md`. */
  securityUrl: string;
}>;

/** Cookie disclosure target. Points at the legal cookie policy on the apex. */
export const LANDING_COOKIE_POLICY_URL =
  "https://xynes.com/legal/cookies" as const;

/** Apex marketing site. The brand mark in the nav links here. */
export const LANDING_BRAND_HREF = "https://xynes.com" as const;

/** Internal auth-app destinations. */
export const LANDING_INTERNAL_LINKS = Object.freeze({
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  security: "/SECURITY.md",
} as const);

/** External destinations referenced by the footer + trust strip. */
export const LANDING_EXTERNAL_LINKS = Object.freeze({
  repoAuthApp: "https://github.com/Xynes-Studio/xynes-auth-app",
  repoAuthSdk: "https://github.com/Xynes-Studio/xynes-auth-sdk",
  docs: "https://docs.xynes.com",
  apex: "https://xynes.com",
  status: "https://status.xynes.com",
  legalPrivacy: "https://xynes.com/legal/privacy",
  legalTerms: "https://xynes.com/legal/terms",
  legalCookies: LANDING_COOKIE_POLICY_URL,
} as const);

/**
 * Per-feature structural spec. The order here is the rendered order.
 * Each card's visible strings come from
 *   `auth.landing.features.<key>.headline`
 *   `auth.landing.features.<key>.body`
 */
export const LANDING_FEATURES: ReadonlyArray<LandingFeatureSpec> =
  Object.freeze([
    Object.freeze({
      key: "workspaceScoped",
      headlineKey: "features.workspaceScoped.headline",
      bodyKey: "features.workspaceScoped.body",
      icon: "shield-check",
    } as const),
    Object.freeze({
      key: "sso",
      headlineKey: "features.sso.headline",
      bodyKey: "features.sso.body",
      icon: "globe",
    } as const),
    Object.freeze({
      key: "openSource",
      headlineKey: "features.openSource.headline",
      bodyKey: "features.openSource.body",
      icon: "code",
    } as const),
  ] as const);

/** Trust-strip target. License is AGPL-3.0 per LP-AUTH §5. */
export const LANDING_TRUST: LandingTrustSpec = Object.freeze({
  repoUrl: LANDING_EXTERNAL_LINKS.repoAuthApp,
  license: "AGPL-3.0",
  securityUrl: LANDING_INTERNAL_LINKS.security,
} as const);

/**
 * Footer column contract. Visible labels come from
 * `auth.landing.footer.columns.<col>.<key>` so the component below picks them
 * up via `t(...)`. The component composes this static structural list with
 * the runtime labels — order here is the rendered order.
 */
export type LandingFooterColumnSpec = Readonly<{
  /** i18n key under `auth.landing.footer.columns.<col>`. */
  headingKey: string;
  links: ReadonlyArray<
    Readonly<{
      /** i18n key under `auth.landing.footer.columns.<col>`. */
      labelKey: string;
      href: string;
      external?: boolean;
      /** Optional analytics-friendly id. */
      id?: string;
    }>
  >;
}>;

export const LANDING_FOOTER_COLUMNS: ReadonlyArray<LandingFooterColumnSpec> =
  Object.freeze([
    Object.freeze({
      headingKey: "footer.columns.product.heading",
      links: Object.freeze([
        Object.freeze({
          labelKey: "footer.columns.product.signIn",
          href: LANDING_INTERNAL_LINKS.login,
          id: "footer-signin",
        } as const),
        Object.freeze({
          labelKey: "footer.columns.product.signUp",
          href: LANDING_INTERNAL_LINKS.signup,
          id: "footer-signup",
        } as const),
        Object.freeze({
          labelKey: "footer.columns.product.forgotPassword",
          href: LANDING_INTERNAL_LINKS.forgotPassword,
          id: "footer-forgot",
        } as const),
      ] as const),
    } as const),
    Object.freeze({
      headingKey: "footer.columns.developers.heading",
      links: Object.freeze([
        Object.freeze({
          labelKey: "footer.columns.developers.authSdk",
          href: LANDING_EXTERNAL_LINKS.repoAuthSdk,
          external: true,
          id: "footer-auth-sdk",
        } as const),
        Object.freeze({
          labelKey: "footer.columns.developers.docs",
          href: LANDING_EXTERNAL_LINKS.docs,
          external: true,
          id: "footer-docs",
        } as const),
      ] as const),
    } as const),
    Object.freeze({
      headingKey: "footer.columns.company.heading",
      links: Object.freeze([
        Object.freeze({
          labelKey: "footer.columns.company.website",
          href: LANDING_EXTERNAL_LINKS.apex,
          external: true,
          id: "footer-apex",
        } as const),
        Object.freeze({
          labelKey: "footer.columns.company.status",
          href: LANDING_EXTERNAL_LINKS.status,
          external: true,
          id: "footer-status",
        } as const),
      ] as const),
    } as const),
    Object.freeze({
      headingKey: "footer.columns.legal.heading",
      links: Object.freeze([
        Object.freeze({
          labelKey: "footer.columns.legal.privacy",
          href: LANDING_EXTERNAL_LINKS.legalPrivacy,
          external: true,
          id: "footer-privacy",
        } as const),
        Object.freeze({
          labelKey: "footer.columns.legal.terms",
          href: LANDING_EXTERNAL_LINKS.legalTerms,
          external: true,
          id: "footer-terms",
        } as const),
        Object.freeze({
          labelKey: "footer.columns.legal.cookies",
          href: LANDING_EXTERNAL_LINKS.legalCookies,
          external: true,
          id: "footer-cookies",
        } as const),
        Object.freeze({
          labelKey: "footer.columns.legal.security",
          href: LANDING_INTERNAL_LINKS.security,
          id: "footer-security",
        } as const),
      ] as const),
    } as const),
  ] as const);

/**
 * Materializes the runtime `MarketingFooterColumn[]` for `<MarketingFooter>`
 * given a translator function. Kept here (rather than inline in `page.tsx`)
 * so the same wiring can be exercised by a unit test.
 */
export function buildFooterColumns(
  translate: (key: string) => string,
): ReadonlyArray<MarketingFooterColumn> {
  return LANDING_FOOTER_COLUMNS.map((col) => ({
    heading: translate(col.headingKey),
    links: col.links.map((link) => ({
      label: translate(link.labelKey),
      href: link.href,
      external: link.external,
      id: link.id,
    })),
  }));
}
