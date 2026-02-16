export const WORKSPACE_STORAGE_KEY = "xynes_workspace_id";

type WorkspaceLike = {
  id?: unknown;
};

function normalizeWorkspaceId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function extractWorkspaceIds(workspaces: unknown[]): string[] {
  const ids: string[] = [];

  for (const workspace of workspaces) {
    const candidate = workspace as WorkspaceLike | null;
    const id = normalizeWorkspaceId(candidate?.id);
    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

export function selectWorkspaceIdForPersistence({
  workspaces,
  storedWorkspaceId,
}: {
  workspaces: unknown[];
  storedWorkspaceId: string | null | undefined;
}): string | null {
  const availableIds = extractWorkspaceIds(workspaces);

  if (availableIds.length === 0) {
    return null;
  }

  const normalizedStored = normalizeWorkspaceId(storedWorkspaceId);

  if (normalizedStored && availableIds.includes(normalizedStored)) {
    return normalizedStored;
  }

  return availableIds[0];
}
