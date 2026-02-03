/**
 * Effective Origin Utilities
 *
 * Computes a safe "public" origin for redirects when the app is behind a proxy
 * (e.g., local dev via port forwarding or reverse proxy).
 *
 * Security notes:
 * - Never blindly trust `Host` / `x-forwarded-*`.
 * - Avoid forcing a configured origin; derive from request + allowlisted headers.
 * - If deriving from headers, only accept hosts that match an allowlist.
 */

function getFirstHeaderValue(headers: Headers, name: string): string {
  return (headers.get(name) ?? "").split(",")[0]?.trim() ?? "";
}

function normalizeHost(candidate: string): string {
  return candidate.trim().toLowerCase();
}

function isWellFormedHost(host: string): boolean {
  if (!host) return false;
  // Reject obvious injection / parsing hazards.
  if (/[\s\\/]/.test(host)) return false;
  if (host.includes("@")) return false;

  // Allow IPv6 in brackets, optionally with port.
  if (/^\[[0-9a-f:.]+\](?::\d{1,5})?$/i.test(host)) return true;

  // Allow hostname[:port]
  return /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host);
}

function isAllowedHost(host: string): boolean {
  const env = process.env.NODE_ENV;
  const normalized = normalizeHost(host);

  const hostWithoutPort = normalized.split(":")[0] ?? normalized;

  if (env === "development" || env === "test") {
    return hostWithoutPort === "localhost" || hostWithoutPort === "127.0.0.1";
  }

  // Production: restrict to our domain.
  return (
    hostWithoutPort === "xynes.com" || hostWithoutPort.endsWith(".xynes.com")
  );
}

function pickSafeHost(candidates: string[]): string {
  for (const candidate of candidates) {
    const normalized = normalizeHost(candidate);
    if (!isWellFormedHost(normalized)) continue;
    if (!isAllowedHost(normalized)) continue;
    return normalized;
  }
  return "";
}

function pickSafeProto(candidates: string[]): "http" | "https" {
  for (const candidate of candidates) {
    const normalized = candidate.trim().toLowerCase();
    if (normalized === "http" || normalized === "https") return normalized;
  }

  return process.env.NODE_ENV === "production" ? "https" : "http";
}

/**
 * Returns a safe origin string (e.g., `https://auth.xynes.com`).
 */
export function getEffectiveOrigin(
  requestUrl: string,
  headers: Headers,
): string {
  const url = new URL(requestUrl);

  const forwardedHost = getFirstHeaderValue(headers, "x-forwarded-host");
  const safeForwardedHost = pickSafeHost([forwardedHost]);

  const proto = pickSafeProto([
    safeForwardedHost ? getFirstHeaderValue(headers, "x-forwarded-proto") : "",
    url.protocol.replace(":", ""),
  ]);

  const host =
    safeForwardedHost ||
    pickSafeHost([headers.get("host") ?? "", url.host]) ||
    url.host;

  return `${proto}://${host}`;
}
