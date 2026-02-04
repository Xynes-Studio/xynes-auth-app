import { describe, it, expect } from "vitest";
import {
  buildWorkspaceMembers,
  filterWorkspaceMembers,
} from "./workspace-members";

type WorkspaceRole = "workspace_owner" | "workspace_admin" | "workspace_member";

type User = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

type Workspace = {
  id: string;
  name: string;
  slug: string;
  planType: "free" | "pro" | "enterprise";
  role: WorkspaceRole;
  createdAt: string;
  updatedAt: string;
};

const baseUser: User = {
  id: "user-1",
  email: "me@xynes.com",
  displayName: "Ada Lovelace",
  avatarUrl: null,
  emailVerified: true,
  createdAt: "2025-01-01",
  updatedAt: "2025-01-01",
};

const baseWorkspace: Workspace = {
  id: "ws-1",
  name: "Xynes",
  slug: "xynes",
  planType: "pro",
  role: "workspace_owner",
  createdAt: "2025-01-01",
  updatedAt: "2025-01-01",
};

describe("buildWorkspaceMembers", () => {
  it("returns empty when user or workspace is missing", () => {
    expect(buildWorkspaceMembers({ user: null, workspace: null })).toEqual([]);
  });

  it("returns current user with role and status", () => {
    const members = buildWorkspaceMembers({
      user: baseUser,
      workspace: baseWorkspace,
    });

    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      id: "user-1",
      email: "me@xynes.com",
      displayName: "Ada Lovelace",
      role: "workspace_owner",
      status: "active",
      isCurrentUser: true,
    });
  });
});

describe("filterWorkspaceMembers", () => {
  it("filters by name, email, and role", () => {
    const members = [
      {
        id: "user-1",
        email: "ada@xynes.com",
        displayName: "Ada Lovelace",
        avatarUrl: null,
        role: "workspace_owner" as WorkspaceRole,
        status: "active" as const,
        isCurrentUser: true,
      },
      {
        id: "user-2",
        email: "grace@xynes.com",
        displayName: "Grace Hopper",
        avatarUrl: null,
        role: "workspace_member" as WorkspaceRole,
        status: "active" as const,
        isCurrentUser: false,
      },
    ];

    expect(filterWorkspaceMembers(members, "grace")).toHaveLength(1);
    expect(filterWorkspaceMembers(members, "owner")).toHaveLength(1);
    expect(filterWorkspaceMembers(members, "@xynes.com")).toHaveLength(2);
  });

  it("handles members without role values", () => {
    const members = [
      {
        id: "user-3",
        email: "edge@xynes.com",
        displayName: null,
        avatarUrl: null,
        role: undefined as unknown as WorkspaceRole,
        status: "active" as const,
        isCurrentUser: false,
      },
    ];

    expect(() => filterWorkspaceMembers(members, "edge")).not.toThrow();
    expect(filterWorkspaceMembers(members, "edge")).toHaveLength(1);
  });
});
