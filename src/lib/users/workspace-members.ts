import type { User, Workspace, WorkspaceRole } from "@xynes/auth-sdk";

export type WorkspaceMemberStatus = "active" | "inactive";

export type WorkspaceMemberItem = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
  isCurrentUser: boolean;
};

export function buildWorkspaceMembers({
  user,
  workspace,
}: {
  user: User | null;
  workspace: Workspace | null;
}): WorkspaceMemberItem[] {
  if (!user || !workspace) return [];

  return [
    {
      id: user.id,
      email: user.email,
      displayName: user.displayName ?? null,
      avatarUrl: user.avatarUrl ?? null,
      role: workspace.role,
      status: "active",
      isCurrentUser: true,
    },
  ];
}

export function filterWorkspaceMembers(
  members: WorkspaceMemberItem[],
  query: string,
): WorkspaceMemberItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return members;

  return members.filter((member) => {
    const name = member.displayName?.toLowerCase() ?? "";
    const email = member.email?.toLowerCase() ?? "";
    const role = member.role?.toLowerCase() ?? "";
    return (
      name.includes(normalized) ||
      email.includes(normalized) ||
      role.includes(normalized)
    );
  });
}
