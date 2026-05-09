/**
 * OAuth Error Messages
 *
 * User-friendly error messages for OAuth error codes.
 * Based on OAuth 2.0 RFC 6749 error codes.
 *
 * Two complementary surfaces:
 *
 * 1. {@link getOAuthErrorMessageKey} — preferred for client components that
 *    have access to `useTranslations("auth.errors.oauth")`. Returns a
 *    translation-catalog key so the rendered copy is locale-aware.
 * 2. {@link OAUTH_ERROR_MESSAGES} / {@link getOAuthErrorMessage} — kept for
 *    surfaces that cannot use the next-intl client (e.g. legacy callback
 *    flow). Always returns the canonical en-US copy as a stable fallback.
 *
 * Provider-supplied error descriptions are intentionally NOT accepted to
 * prevent XSS attacks from malicious or compromised OAuth providers.
 *
 * @module errors/oauth
 */

/**
 * Maps OAuth error codes to user-friendly error messages (en-US source of
 * truth). Translated copies live in `messages/<locale>/auth.errors.json`
 * under `oauth.<code>` and are kept in sync with this map.
 */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    "You denied the request or the OAuth provider declined access. Please try again.",
  invalid_request:
    "The authentication request was invalid. Please try signing in again.",
  unauthorized_client:
    "This application is not authorized to use this sign-in method.",
  unsupported_response_type:
    "The authentication method is unsupported. Please contact support.",
  invalid_scope:
    "The requested permissions (scope) are invalid. Please contact support.",
  server_error:
    "The authentication server encountered an error. Please try again later.",
  temporarily_unavailable:
    "The authentication service is temporarily unavailable. Please try again later.",
  auth_callback_error:
    "There was an error processing your sign-in. Please try again.",
};

/**
 * Translation keys (under `auth.errors.oauth`) that the auth catalogs are
 * required to provide.
 */
export type OAuthErrorMessageKey =
  | "access_denied"
  | "invalid_request"
  | "unauthorized_client"
  | "unsupported_response_type"
  | "invalid_scope"
  | "server_error"
  | "temporarily_unavailable"
  | "auth_callback_error"
  | "fallback";

const KNOWN_OAUTH_ERROR_KEYS: ReadonlySet<string> = new Set(
  Object.keys(OAUTH_ERROR_MESSAGES),
);

/**
 * Maps an OAuth error code received from the URL to a translation key.
 * Unknown error codes collapse to `fallback` so we never echo arbitrary
 * provider-supplied strings back into the DOM.
 */
export function getOAuthErrorMessageKey(
  errorCode: string,
): OAuthErrorMessageKey {
  if (KNOWN_OAUTH_ERROR_KEYS.has(errorCode)) {
    return errorCode as OAuthErrorMessageKey;
  }
  return "fallback";
}

/**
 * Gets a user-friendly error message for an OAuth error code in en-US.
 *
 * Prefer {@link getOAuthErrorMessageKey} from translated client components.
 * This helper is kept so the legacy callback flow has a stable fallback when
 * it cannot reach the next-intl client (e.g. during early hydration errors).
 *
 * @param errorCode - The OAuth error code from the URL
 * @returns A user-friendly, safe error message
 */
export function getOAuthErrorMessage(errorCode: string): string {
  return (
    OAUTH_ERROR_MESSAGES[errorCode] ||
    "Something went wrong during authentication. Please try again."
  );
}
