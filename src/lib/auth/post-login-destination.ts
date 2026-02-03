import { getSafeRedirectUrl, isValidRedirectUrl } from "@/lib/redirect";

export interface WorkspaceForRedirect {
  slug?: string | null;
}

export interface DeterminePostLoginDestinationOptions {
  workspaces: WorkspaceForRedirect[];
  redirectParam?: string | null;
  consoleBaseUrl?: string | null;
  allowedRedirectDomains: string[];
}

function sanitizeWorkspaceSlug(rawSlug: string): string {
  return rawSlug.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function isLoginPath(url: string): boolean {
  // Only try to detect loops for relative URLs (absolute URLs can be login pages too)
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url === "/login" || url.startsWith("/login?");
  }
  return false;
}

export function determinePostLoginDestination({
  workspaces,
  redirectParam,
  consoleBaseUrl,
  allowedRedirectDomains,
}: DeterminePostLoginDestinationOptions): string {
  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];

  const count = safeWorkspaces.length;
  let defaultDestination = "/workspaces";

  if (count === 0) {
    defaultDestination = "/onboarding";
  } else if (count === 1) {
    const slug = safeWorkspaces[0]?.slug ?? "";
    const safeSlug = sanitizeWorkspaceSlug(slug);

    // If slug is missing, fall back to workspace selector
    if (!safeSlug) {
      defaultDestination = "/workspaces";
    } else {
      const localFallback = `/dashboard/${safeSlug}`;
      const baseUrl = (consoleBaseUrl ?? "").trim();

      if (baseUrl && isValidRedirectUrl(baseUrl, allowedRedirectDomains)) {
        defaultDestination = `${trimTrailingSlash(baseUrl)}/${safeSlug}`;
      } else {
        defaultDestination = localFallback;
      }
    }
  }

  const candidate = redirectParam ? redirectParam.trim() : "";
  const resolved = candidate
    ? getSafeRedirectUrl(candidate, defaultDestination, allowedRedirectDomains)
    : defaultDestination;

  // Defense-in-depth: avoid redirect loops back to /login
  if (isLoginPath(resolved)) {
    return defaultDestination;
  }

  return resolved;
}
