/**
 * Validates if a redirect URL is safe (prevents open redirect attacks)
 */
export function isValidRedirectUrl(url: string, allowedDomains: string[]): boolean {
  if (!url || typeof url !== 'string') {
    return false;
  }

  // Reject javascript: and data: URLs
  const lowerUrl = url.toLowerCase().trim();
  if (lowerUrl.startsWith('javascript:') || lowerUrl.startsWith('data:')) {
    return false;
  }

  // Allow relative URLs (they stay on the same origin)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    return allowedDomains.some((domain) => {
      const lowerDomain = domain.toLowerCase();

      // Handle localhost with port
      if (lowerDomain.includes(':')) {
        const [domainHost, domainPort] = lowerDomain.split(':');
        return hostname === domainHost && parsedUrl.port === domainPort;
      }

      // Exact match or subdomain match
      return hostname === lowerDomain || hostname.endsWith(`.${lowerDomain}`);
    });
  } catch {
    return false;
  }
}

/**
 * Returns a safe redirect URL, falling back to default if invalid
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
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }

  if (isValidRedirectUrl(url, allowedDomains)) {
    return url;
  }

  return defaultUrl;
}

/**
 * Gets allowed redirect domains from environment
 */
export function getAllowedRedirectDomains(): string[] {
  const domains = process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS || 'xynes.com,localhost:3000,localhost:3001';
  return domains.split(',').map((d) => d.trim());
}
