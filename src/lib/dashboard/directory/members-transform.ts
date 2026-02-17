import type { WorkspaceRole } from "@xynes/auth-sdk";

export type DirectorySortOption =
  | "joined_desc"
  | "joined_asc"
  | "name_asc"
  | "name_desc";

export type DirectoryMember = {
  id: string;
  email: string;
  displayName: string | null;
  name: string;
  avatarUrl: string | null;
  status: string;
  joinedAt: string | null;
  roleKey: WorkspaceRole;
  designation: "Owner" | "Admin" | "Member";
};

type UnknownRecord = Record<string, unknown>;

const DEFAULT_ROLE: WorkspaceRole = "workspace_member";

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function getNameFromEmail(email: string): string {
  const [localPart] = email.split("@");
  return localPart?.trim() || "Unknown";
}

function getRoleDesignation(roleKey: WorkspaceRole): "Owner" | "Admin" | "Member" {
  if (roleKey === "workspace_owner") return "Owner";
  if (roleKey === "workspace_admin") return "Admin";
  return "Member";
}

function normalizeRole(role: unknown): WorkspaceRole {
  if (
    role === "workspace_owner" ||
    role === "workspace_admin" ||
    role === "workspace_member"
  ) {
    return role;
  }
  return DEFAULT_ROLE;
}

export function unwrapGatewayData(value: unknown): unknown {
  let current = value;
  while (isRecord(current) && "data" in current && current.data !== undefined) {
    current = current.data;
  }
  return current;
}

function normalizeMember(value: unknown): DirectoryMember | null {
  if (!isRecord(value)) return null;

  const id = asString(value.userId);
  const email = asString(value.email);
  if (!id || !email) return null;

  const displayName = asString(value.displayName);
  const roleKey = normalizeRole(value.roleKey);

  return {
    id,
    email,
    displayName,
    name: displayName?.trim() || getNameFromEmail(email),
    avatarUrl: asString(value.avatarUrl),
    status: asString(value.status) || "active",
    joinedAt: asString(value.joinedAt),
    roleKey,
    designation: getRoleDesignation(roleKey),
  };
}

export function toDirectoryMembers(payload: unknown): DirectoryMember[] {
  const data = unwrapGatewayData(payload);
  if (!isRecord(data) || !Array.isArray(data.members)) {
    return [];
  }

  return data.members
    .map((member) => normalizeMember(member))
    .filter((member): member is DirectoryMember => member !== null);
}

export function filterDirectoryMembers(
  members: DirectoryMember[],
  query: string,
): DirectoryMember[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return members;

  return members.filter((member) => {
    const name = member.name.toLowerCase();
    const email = member.email.toLowerCase();
    const designation = member.designation.toLowerCase();
    return (
      name.includes(normalized) ||
      email.includes(normalized) ||
      designation.includes(normalized)
    );
  });
}

function toTimestamp(value: string | null): number {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortDirectoryMembers(
  members: DirectoryMember[],
  sort: DirectorySortOption,
): DirectoryMember[] {
  const copy = [...members];

  switch (sort) {
    case "joined_desc":
      return copy.sort((a, b) => toTimestamp(b.joinedAt) - toTimestamp(a.joinedAt));
    case "joined_asc":
      return copy.sort((a, b) => toTimestamp(a.joinedAt) - toTimestamp(b.joinedAt));
    case "name_asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    default:
      return copy;
  }
}

export function getDirectoryUiState(resultCount: number): {
  isSelectAllDisabled: boolean;
  isSortDisabled: boolean;
} {
  const disableBulkControls = resultCount <= 1;
  return {
    isSelectAllDisabled: disableBulkControls,
    isSortDisabled: disableBulkControls,
  };
}
