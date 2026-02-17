import { toDirectoryMembers, type DirectoryMember } from "./members-transform";

type UnknownRecord = Record<string, unknown>;

export class DirectoryMembersApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "DirectoryMembersApiError";
    this.statusCode = statusCode;
  }
}

export interface FetchWorkspaceMembersParams {
  apiBaseUrl: string;
  workspaceId: string;
  getAccessToken: () => Promise<string | null>;
  signal?: AbortSignal;
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function extractErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null;

  if (typeof payload.message === "string") {
    return payload.message;
  }

  if (isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  return null;
}

export async function fetchWorkspaceMembers({
  apiBaseUrl,
  workspaceId,
  getAccessToken,
  signal,
}: FetchWorkspaceMembersParams): Promise<DirectoryMember[]> {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/$/, "");
  if (!normalizedBaseUrl) {
    throw new DirectoryMembersApiError(500, "API base URL is not configured");
  }

  const normalizedWorkspaceId = workspaceId.trim();
  if (!normalizedWorkspaceId) {
    throw new DirectoryMembersApiError(400, "Workspace is not selected");
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new DirectoryMembersApiError(401, "You are not authenticated");
  }

  const response = await fetch(
    `${normalizedBaseUrl}/workspaces/${encodeURIComponent(normalizedWorkspaceId)}/members`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new DirectoryMembersApiError(
      response.status,
      extractErrorMessage(payload) || response.statusText || "Failed to fetch users",
    );
  }

  return toDirectoryMembers(payload);
}
