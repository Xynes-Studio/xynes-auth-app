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

function normalizeAllowedDomain(entry: string): string | null {
  const candidate = entry.trim().toLowerCase();
  if (!candidate) return null;
  if (
    candidate.includes("://") ||
    candidate.includes("/") ||
    candidate.includes("?") ||
    candidate.includes("#")
  ) {
    return null;
  }

  const match = candidate.match(/^([a-z0-9.-]+)(?::(\d{1,5}))?$/);
  if (!match) return null;

  const port = match[2];
  if (port) {
    const portNumber = Number(port);
    if (portNumber < 1 || portNumber > 65535) {
      return null;
    }
  }

  return candidate;
}

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

  const envAllowlist = [
    process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS,
    process.env.ALLOWED_REDIRECT_DOMAINS,
    process.env.PUBLIC_ALLOWED_REDIRECT_DOMAINS,
  ]
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value));

  if (envAllowlist) {
    const parsed = envAllowlist
      .split(",")
      .map((d) => normalizeAllowedDomain(d))
      .filter((d): d is string => Boolean(d));
    for (const domain of parsed) {
      domains.add(domain);
    }
  }

  return Array.from(domains);
}
