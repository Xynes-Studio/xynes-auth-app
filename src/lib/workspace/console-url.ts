const WORKSPACE_SLUG_PATTERN = /^[a-z][a-z0-9-]{1,62}$/;

export const WORKSPACE_ADMIN_FALLBACK_PATH = "/dashboard/apps";

export function normalizeWorkspaceSlugForCmsPath(
  workspaceSlug?: string | null,
): string | null {
  const safeSlug = workspaceSlug?.trim().toLowerCase() ?? "";
  return WORKSPACE_SLUG_PATTERN.test(safeSlug) ? safeSlug : null;
}

export function buildCmsWorkspaceContentPath(
  workspaceSlug?: string | null,
): string | null {
  const safeSlug = normalizeWorkspaceSlugForCmsPath(workspaceSlug);
  return safeSlug ? `/dashboard/${safeSlug}/content` : null;
}

export function normalizeConsoleBaseUrl(baseUrl?: string | null): string | null {
  const candidate = baseUrl?.trim().replace(/\/+$/, "") ?? "";
  if (!candidate) return null;

  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate === "/" ? "" : candidate;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

export function buildCmsWorkspaceContentUrl({
  baseUrl,
  workspaceSlug,
  fallbackUrl = WORKSPACE_ADMIN_FALLBACK_PATH,
}: {
  baseUrl?: string | null;
  workspaceSlug?: string | null;
  fallbackUrl?: string;
}): string {
  const path = buildCmsWorkspaceContentPath(workspaceSlug);
  if (!path) return fallbackUrl;

  const normalizedBaseUrl = normalizeConsoleBaseUrl(baseUrl);
  if (!normalizedBaseUrl) return fallbackUrl;

  return `${normalizedBaseUrl}${path}`;
}
