import { getSafeRedirectUrl } from "./index";

export const OAUTH_REDIRECT_STORAGE_KEY = "xynes.auth.oauth_redirect";

export type RedirectStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

/**
 * Persist a validated OAuth redirect URL for use after the provider round-trip.
 * Returns the stored value, or null if the URL is invalid.
 */
export function persistOAuthRedirect(
  redirectUrl: string | null | undefined,
  allowedDomains: string[],
  storage: RedirectStorage,
): string | null {
  const normalized = redirectUrl?.trim() ?? "";

  if (!normalized) {
    storage.removeItem(OAUTH_REDIRECT_STORAGE_KEY);
    return null;
  }

  const safeRedirect = getSafeRedirectUrl(
    normalized,
    "",
    allowedDomains,
  ).trim();

  if (!safeRedirect) {
    storage.removeItem(OAUTH_REDIRECT_STORAGE_KEY);
    return null;
  }

  storage.setItem(OAUTH_REDIRECT_STORAGE_KEY, safeRedirect);
  return safeRedirect;
}

/**
 * Read a persisted OAuth redirect URL, if any.
 */
export function readPersistedOAuthRedirect(
  storage: RedirectStorage,
): string | null {
  const stored = storage.getItem(OAUTH_REDIRECT_STORAGE_KEY);
  const normalized = stored?.trim() ?? "";
  return normalized ? normalized : null;
}

/**
 * Clear any persisted OAuth redirect URL.
 */
export function clearPersistedOAuthRedirect(storage: RedirectStorage): void {
  storage.removeItem(OAUTH_REDIRECT_STORAGE_KEY);
}

/**
 * Resolve the redirect URL from query param or stored value with validation.
 */
export function resolveOAuthRedirect(
  redirectParam: string | null,
  storedRedirect: string | null,
  defaultUrl: string,
  allowedDomains: string[],
): string {
  const candidate = redirectParam?.trim() || storedRedirect?.trim() || "";
  return getSafeRedirectUrl(candidate, defaultUrl, allowedDomains);
}
