/**
 * Logout Module
 *
 * Exports logout-related utilities for authentication flow.
 *
 * @module logout
 */

export {
  buildLogoutRedirectUrl,
  getPostLogoutRedirectUrl,
  getCookieClearingOptions,
  getSupabaseCookieNames,
  SUPABASE_COOKIE_PREFIXES,
  type CookieClearingOptions,
} from "./logout-utils";
