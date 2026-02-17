export interface AppCatalogItem {
  id: string;
  title: string;
  avatarSrc?: string;
  installedAt: string;
}

export type AppsSortOption = "date_desc" | "date_asc" | "name_asc" | "name_desc";

const CMS_BASE_URL = "http://localhost:3000";
const WORKSPACE_SLUG_PATTERN = /^[a-z][a-z0-9-]{1,62}$/;

export function filterAppsByQuery(
  items: AppCatalogItem[],
  query: string,
): AppCatalogItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items;
  }

  return items.filter((item) => item.title.toLowerCase().includes(normalized));
}

export function sortApps(
  items: AppCatalogItem[],
  sort: AppsSortOption,
): AppCatalogItem[] {
  const copy = [...items];

  switch (sort) {
    case "date_desc":
      return copy.sort(
        (a, b) =>
          new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime(),
      );
    case "date_asc":
      return copy.sort(
        (a, b) =>
          new Date(a.installedAt).getTime() - new Date(b.installedAt).getTime(),
      );
    case "name_asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "name_desc":
      return copy.sort((a, b) => b.title.localeCompare(a.title));
    default:
      return copy;
  }
}

export function buildCmsLaunchUrl(workspaceSlug?: string | null): string {
  const safeSlug = workspaceSlug?.trim().toLowerCase() ?? "";
  if (!WORKSPACE_SLUG_PATTERN.test(safeSlug)) {
    return CMS_BASE_URL;
  }

  return `${CMS_BASE_URL}/${safeSlug}`;
}

export function getAppsUiState(resultCount: number): {
  isSelectAllDisabled: boolean;
  isSortDisabled: boolean;
} {
  const disableBulkControls = resultCount <= 1;

  return {
    isSelectAllDisabled: disableBulkControls,
    isSortDisabled: disableBulkControls,
  };
}
