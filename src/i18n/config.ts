import { negotiateLocale, normalizeLocale, type Locale } from "@xynes/i18n";
import enUsCommon from "../../messages/en-US/auth.common.json";
import enUsDashboard from "../../messages/en-US/auth.dashboard.json";
import enUsErrors from "../../messages/en-US/auth.errors.json";
import enUsForgot from "../../messages/en-US/auth.forgot-password.json";
import enUsInvite from "../../messages/en-US/auth.invite.json";
import enUsLogin from "../../messages/en-US/auth.login.json";
import enUsOnboarding from "../../messages/en-US/auth.onboarding.json";
import enUsReset from "../../messages/en-US/auth.reset-password.json";
import enUsSignup from "../../messages/en-US/auth.signup.json";
import enUsWorkspaces from "../../messages/en-US/auth.workspaces.json";
import enXaCommon from "../../messages/en-XA/auth.common.json";
import enXaDashboard from "../../messages/en-XA/auth.dashboard.json";
import enXaErrors from "../../messages/en-XA/auth.errors.json";
import enXaForgot from "../../messages/en-XA/auth.forgot-password.json";
import enXaInvite from "../../messages/en-XA/auth.invite.json";
import enXaLogin from "../../messages/en-XA/auth.login.json";
import enXaOnboarding from "../../messages/en-XA/auth.onboarding.json";
import enXaReset from "../../messages/en-XA/auth.reset-password.json";
import enXaSignup from "../../messages/en-XA/auth.signup.json";
import enXaWorkspaces from "../../messages/en-XA/auth.workspaces.json";

/**
 * Canonical locale cookie shared with the CMS console and any future Xynes
 * frontend. Reading locale from a cookie keeps the auth callback / redirect /
 * dashboard route surfaces stable (no `[locale]` segment).
 */
export const AUTH_LOCALE_COOKIE = "xynes_locale";

export type AuthMessages = {
  auth: {
    common: typeof enUsCommon;
    dashboard: typeof enUsDashboard;
    errors: typeof enUsErrors;
    login: typeof enUsLogin;
    signup: typeof enUsSignup;
    forgotPassword: typeof enUsForgot;
    resetPassword: typeof enUsReset;
    invite: typeof enUsInvite;
    onboarding: typeof enUsOnboarding;
    workspaces: typeof enUsWorkspaces;
  };
};

export type AuthLocaleResolutionInput = {
  explicitLocale?: unknown;
  cookieLocale?: unknown;
  acceptLanguage?: unknown;
};

/**
 * Static, build-time message map. Keys are constrained to `Locale`, so a
 * hostile cookie value cannot drive a dynamic import path.
 */
const AUTH_MESSAGES_BY_LOCALE: Record<Locale, AuthMessages> = {
  "en-US": {
    auth: {
      common: enUsCommon,
      dashboard: enUsDashboard,
      errors: enUsErrors,
      login: enUsLogin,
      signup: enUsSignup,
      forgotPassword: enUsForgot,
      resetPassword: enUsReset,
      invite: enUsInvite,
      onboarding: enUsOnboarding,
      workspaces: enUsWorkspaces,
    },
  },
  "en-XA": {
    auth: {
      common: enXaCommon,
      dashboard: enXaDashboard,
      errors: enXaErrors,
      login: enXaLogin,
      signup: enXaSignup,
      forgotPassword: enXaForgot,
      resetPassword: enXaReset,
      invite: enXaInvite,
      onboarding: enXaOnboarding,
      workspaces: enXaWorkspaces,
    },
  },
};

/**
 * Negotiates the active locale for the auth app. Always fails closed to
 * `en-US` for unsupported, malformed, or hostile inputs (e.g. path-traversal
 * style cookies, `javascript:` URIs, unsupported BCP-47 tags).
 */
export function resolveAuthLocale(
  input: AuthLocaleResolutionInput = {},
): Locale {
  return negotiateLocale(input);
}

/**
 * Returns the static catalog map for the resolved locale. The lookup is keyed
 * on `normalizeLocale(...)` so unrecognized inputs collapse to the default
 * locale before any catalog is selected.
 */
export function getAuthMessages(locale: unknown): AuthMessages {
  return AUTH_MESSAGES_BY_LOCALE[normalizeLocale(locale)];
}
