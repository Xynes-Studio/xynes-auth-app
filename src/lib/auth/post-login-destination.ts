import { getSafeRedirectUrl } from "@/lib/redirect";

export interface WorkspaceForRedirect {
  slug?: string | null;
}

export interface DeterminePostLoginDestinationOptions {
  workspaces: WorkspaceForRedirect[];
  redirectParam?: string | null;
  allowedRedirectDomains: string[];
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
  allowedRedirectDomains,
}: DeterminePostLoginDestinationOptions): string {
  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];

  const count = safeWorkspaces.length;
  const defaultDestination = count === 0 ? "/onboarding" : "/dashboard/apps";

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
