/**
 * Logout Utilities
 *
 * Pure functions for handling logout flow operations.
 * Includes redirect URL building, cookie management, and security validations.
 *
 * @module logout
 * @see AUTH-FE-1.7 Logout Flow Story
 */

import { getSafeRedirectUrl } from "../redirect";

/**
 * Supabase authentication cookie prefixes.
 * These prefixes are used to identify and clear Supabase session cookies.
 *
 * @security httpOnly cookies are cleared server-side to prevent token theft
 */
export const SUPABASE_COOKIE_PREFIXES = [
  "sb-", // Main Supabase auth cookie prefix
  "supabase-auth-token", // Alternative Supabase cookie format
] as const;

/**
 * Cookie options for clearing authentication cookies.
 */
export interface CookieClearingOptions {
  path: string;
  domain: string | undefined;
  secure: boolean;
  httpOnly: boolean;
  sameSite: "strict" | "lax" | "none";
  maxAge: number;
  expires: Date;
}

/**
 * Builds the redirect URL to navigate to after logout.
 *
 * @param authAppUrl - Base URL of the auth app (e.g., 'https://auth.xynes.com')
 * @param postLogoutRedirect - Optional URL to redirect to after reaching login page
 * @returns The complete logout redirect URL
 *
 * @example
 * buildLogoutRedirectUrl('https://auth.xynes.com', 'https://cms.xynes.com')
 * // => 'https://auth.xynes.com/login?redirect=https%3A%2F%2Fcms.xynes.com'
 */
export function buildLogoutRedirectUrl(
  authAppUrl: string,
  postLogoutRedirect?: string
): string {
  // Ensure no double slashes
  const baseUrl = authAppUrl.endsWith("/")
    ? authAppUrl.slice(0, -1)
    : authAppUrl;

  const loginUrl = new URL("/login", baseUrl);

  if (postLogoutRedirect && postLogoutRedirect.trim()) {
    loginUrl.searchParams.set("redirect", postLogoutRedirect);
  }

  return loginUrl.toString();
}

/**
 * Validates and returns a safe post-logout redirect URL.
 * Falls back to default URL if the provided URL is invalid or potentially malicious.
 *
 * This is a thin wrapper around getSafeRedirectUrl with null/undefined handling
 * specific to logout flow requirements.
 *
 * @param redirectUrl - The requested redirect URL (from query params)
 * @param defaultUrl - Fallback URL if redirect is invalid
 * @param allowedDomains - List of allowed redirect domains
 * @returns A validated redirect URL
 *
 * @security Prevents open redirect attacks by validating against allowed domains
 * @see getSafeRedirectUrl - The core validation logic
 */
export function getPostLogoutRedirectUrl(
  redirectUrl: string | null | undefined,
  defaultUrl: string,
  allowedDomains: string[]
): string {
  // Handle null/undefined - normalize to empty string for getSafeRedirectUrl
  const normalizedUrl = redirectUrl?.trim() ?? "";

  // Delegate to the shared redirect validation utility
  return getSafeRedirectUrl(normalizedUrl, defaultUrl, allowedDomains);
}

/**
 * Returns cookie options for clearing authentication cookies.
 * Configuration follows security best practices:
 * - httpOnly: Prevents JavaScript access to prevent XSS attacks
 * - secure: Ensures cookie is only sent over HTTPS in production
 * - sameSite: Prevents CSRF attacks
 * - maxAge: Set to 0 to immediately expire the cookie
 * - expires: Set to past date as a fallback for older browsers
 *
 * @param cookieDomain - The domain for the cookie (e.g., '.xynes.com')
 * @returns Cookie options for clearing
 *
 * @security Follows OWASP recommendations for secure cookie handling
 */
export function getCookieClearingOptions(
  cookieDomain: string | undefined
): CookieClearingOptions {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    path: "/",
    domain: cookieDomain,
    secure: isProduction,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    // Set to epoch time to ensure cookie deletion in older browsers
    expires: new Date(0),
  };
}

/**
 * Filters cookie names to find Supabase authentication cookies.
 * Used to identify which cookies need to be cleared during logout.
 *
 * @param cookieNames - Array of all cookie names
 * @returns Array of cookie names that are Supabase auth cookies
 *
 * @example
 * getSupabaseCookieNames(['sb-auth-token', 'theme', 'sb-refresh-token'])
 * // => ['sb-auth-token', 'sb-refresh-token']
 */
export function getSupabaseCookieNames(cookieNames: string[]): string[] {
  return cookieNames.filter((name) =>
    SUPABASE_COOKIE_PREFIXES.some((prefix) => name.startsWith(prefix))
  );
}
