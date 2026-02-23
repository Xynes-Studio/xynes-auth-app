/**
 * Auth App Redirect Utilities
 *
 * NOTE: Keep these utilities server-safe (no React/provider imports).
 * They intentionally mirror the shared SDK redirect contract.
 *
 * @module redirect
 */

export function isValidRedirectUrl(
  url: string,
  allowedDomains: string[]
): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  const lowerUrl = url.toLowerCase().trim();
  if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:")) {
    return false;
  }

  if (url.startsWith("/") && !url.startsWith("//")) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return false;
    }
    const hostname = parsedUrl.hostname.toLowerCase();

    return allowedDomains.some((domain) => {
      const lowerDomain = domain.toLowerCase();
      if (lowerDomain.includes(":")) {
        const [domainHost, domainPort] = lowerDomain.split(":");
        return hostname === domainHost && parsedUrl.port === domainPort;
      }

      return hostname === lowerDomain || hostname.endsWith(`.${lowerDomain}`);
    });
  } catch {
    return false;
  }
}

export function getSafeRedirectUrl(
  url: string,
  defaultUrl: string,
  allowedDomains: string[]
): string {
  if (!url) {
    return defaultUrl;
  }

  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }

  if (isValidRedirectUrl(url, allowedDomains)) {
    return url;
  }

  return defaultUrl;
}

export function buildAuthRedirectUrl(
  authAppUrl: string,
  path: "login" | "signup" | "logout",
  redirectUrl?: string
): string {
  const url = new URL(`/${path}`, authAppUrl);
  if (redirectUrl) {
    url.searchParams.set("redirect", redirectUrl);
  }
  return url.toString();
}

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
