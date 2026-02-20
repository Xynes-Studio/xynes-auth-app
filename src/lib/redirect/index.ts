/**
 * Auth App Redirect Utilities
 *
 * Canonical redirect primitives are sourced from @xynes/auth-sdk to avoid
 * contract drift between apps and SDK.
 *
 * @module redirect
 */

export {
  isValidRedirectUrl,
  getSafeRedirectUrl,
  buildAuthRedirectUrl,
} from "@xynes/auth-sdk";

/**
 * Get the list of allowed redirect domains for the auth app.
 * This is app-specific configuration based on environment variables.
 *
 * @returns Array of allowed domains for redirects
 */
export function getAllowedRedirectDomains(): string[] {
  const domains = new Set<string>(["xynes.com"]);

  if (process.env.NODE_ENV === "development") {
    domains.add("localhost:3000");
    domains.add("localhost:3001");
    domains.add("localhost:3002");
  }

  const envAllowlist =
    process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS ??
    process.env.ALLOWED_REDIRECT_DOMAINS ??
    process.env.PUBLIC_ALLOWED_REDIRECT_DOMAINS;

  if (envAllowlist) {
    const parsed = envAllowlist
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    for (const domain of parsed) {
      domains.add(domain);
    }
  }

  return Array.from(domains);
}
