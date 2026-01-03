/**
 * Auth App Redirect Utilities
 *
 * Server-safe redirect validation utilities.
 * These are pure functions that work in both client and server contexts.
 *
 * @module redirect
 */

/**
 * Validates if a redirect URL is safe to redirect to.
 * Prevents open redirect attacks by checking against allowed domains.
 *
 * @param url - The URL to validate
 * @param allowedDomains - List of allowed domains (e.g., ['xynes.com', 'localhost:3000'])
 * @returns true if the URL is safe to redirect to
 */
export function isValidRedirectUrl(
  url: string,
  allowedDomains: string[]
): boolean {
  if (!url || typeof url !== "string") {
    return false;
  }

  // Reject javascript: and data: URLs
  const lowerUrl = url.toLowerCase().trim();
  if (lowerUrl.startsWith("javascript:") || lowerUrl.startsWith("data:")) {
    return false;
  }

  // Allow relative URLs (they're safe since they stay on the same origin)
  if (url.startsWith("/") && !url.startsWith("//")) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // Check if the hostname matches any allowed domain
    return allowedDomains.some((domain) => {
      const lowerDomain = domain.toLowerCase();

      // Handle localhost with port (e.g., localhost:3000)
      if (lowerDomain.includes(":")) {
        const [domainHost, domainPort] = lowerDomain.split(":");
        return hostname === domainHost && parsedUrl.port === domainPort;
      }

      // Exact match or subdomain match
      // e.g., 'xynes.com' matches 'xynes.com', 'cms.xynes.com', 'auth.xynes.com'
      return hostname === lowerDomain || hostname.endsWith(`.${lowerDomain}`);
    });
  } catch {
    // Invalid URL
    return false;
  }
}

/**
 * Returns a safe redirect URL, falling back to a default if the URL is invalid.
 *
 * @param url - The URL to validate
 * @param defaultUrl - The fallback URL if validation fails
 * @param allowedDomains - List of allowed domains
 * @returns The validated URL or the default URL
 */
export function getSafeRedirectUrl(
  url: string,
  defaultUrl: string,
  allowedDomains: string[]
): string {
  if (!url) {
    return defaultUrl;
  }

  // Allow relative URLs
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }

  if (isValidRedirectUrl(url, allowedDomains)) {
    return url;
  }

  return defaultUrl;
}

/**
 * Builds a URL to the auth app with an optional redirect parameter.
 *
 * @param authAppUrl - Base URL of the auth app (e.g., 'https://auth.xynes.com')
 * @param path - Path to navigate to (e.g., 'login', 'signup')
 * @param redirectUrl - Optional URL to redirect back to after auth
 * @returns The complete auth app URL
 */
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

/**
 * Get the list of allowed redirect domains for the auth app.
 * This is app-specific configuration based on environment variables.
 *
 * @returns Array of allowed domains for redirects
 */
export function getAllowedRedirectDomains(): string[] {
  const domains: string[] = [];

  // Add xynes production domains
  domains.push("xynes.com");

  // Add localhost for development
  if (process.env.NODE_ENV === "development") {
    domains.push("localhost:3000");
    domains.push("localhost:3001");
    domains.push("localhost:3002");
  }

  // Add custom allowed domains from environment variable
  const customDomains = process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS;
  if (customDomains) {
    const parsed = customDomains.split(",").map((d) => d.trim()).filter(Boolean);
    domains.push(...parsed);
  }

  return domains;
}
