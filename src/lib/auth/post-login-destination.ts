import { getSafeRedirectUrl } from "@/lib/redirect";

export interface WorkspaceForRedirect {
  slug?: string | null;
}

export interface DeterminePostLoginDestinationOptions {
  workspaces: WorkspaceForRedirect[];
  redirectParam?: string | null;
  allowedRedirectDomains: string[];
  requiresProfileCompletion?: boolean;
}

function isLoginPath(url: string): boolean {
  // Only try to detect loops for relative URLs (absolute URLs can be login pages too)
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url === "/login" || url.startsWith("/login?");
  }
  return false;
}

function isCompleteProfilePath(url: string): boolean {
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url === "/complete-profile" || url.startsWith("/complete-profile?");
  }
  return false;
}

function toCompleteProfileDestination(target: string): string {
  if (!target || isCompleteProfilePath(target)) {
    return "/complete-profile";
  }
  return `/complete-profile?redirect=${encodeURIComponent(target)}`;
}

export function determinePostLoginDestination({
  workspaces,
  redirectParam,
  allowedRedirectDomains,
  requiresProfileCompletion = false,
}: DeterminePostLoginDestinationOptions): string {
  const safeWorkspaces = Array.isArray(workspaces) ? workspaces : [];

  const count = safeWorkspaces.length;
  const defaultDestination = count === 0 ? "/onboarding" : "/dashboard/apps";

  const candidate = redirectParam ? redirectParam.trim() : "";
  const resolved = candidate
    ? getSafeRedirectUrl(candidate, defaultDestination, allowedRedirectDomains)
    : defaultDestination;

  if (requiresProfileCompletion) {
    if (isLoginPath(resolved)) {
      return "/complete-profile";
    }
    return toCompleteProfileDestination(resolved);
  }

  // Defense-in-depth: avoid redirect loops back to /login
  if (isLoginPath(resolved)) {
    return defaultDestination;
  }

  return resolved;
}
