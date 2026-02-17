import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DirectoryDashboardContent } from "./DirectoryDashboardContent";

const mockPush = vi.fn();
const mockFetchWorkspaceMembers = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => ({
    getAccessToken: async () => "token",
  }),
  useWorkspace: () => ({
    currentWorkspace: {
      id: "ws-1",
      name: "Xynes",
      slug: "xynes",
    },
  }),
}));

vi.mock("@/lib/dashboard/directory/members-api", () => ({
  fetchWorkspaceMembers: (...args: unknown[]) =>
    mockFetchWorkspaceMembers(...args),
}));

describe("DirectoryDashboardContent", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockFetchWorkspaceMembers.mockReset();
    mockFetchWorkspaceMembers.mockResolvedValue([
      {
        id: "u1",
        email: "ada@xynes.com",
        displayName: "Ada Lovelace",
        name: "Ada Lovelace",
        avatarUrl: null,
        status: "active",
        joinedAt: "2026-02-01T10:00:00.000Z",
        roleKey: "workspace_owner",
        designation: "Owner",
      },
      {
        id: "u2",
        email: "grace@xynes.com",
        displayName: "Grace Hopper",
        name: "Grace Hopper",
        avatarUrl: null,
        status: "active",
        joinedAt: "2026-02-02T10:00:00.000Z",
        roleKey: "workspace_member",
        designation: "Member",
      },
    ]);
  });

  it("loads and displays workspace members in the users tab", async () => {
    render(<DirectoryDashboardContent />);

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(mockFetchWorkspaceMembers).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws-1",
      }),
    );
  });

  it("navigates to invite page when invite people is clicked", async () => {
    const user = userEvent.setup();
    render(<DirectoryDashboardContent />);

    await user.click(screen.getByRole("button", { name: /invite people/i }));
    expect(mockPush).toHaveBeenCalledWith("/workspaces/invites/new");
  });

  it("shows coming-soon panels for teams and invites tabs", async () => {
    const user = userEvent.setup();
    render(<DirectoryDashboardContent />);

    await user.click(screen.getByRole("tab", { name: "Teams" }));
    expect(screen.getByText("Teams are under development")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Invites" }));
    expect(screen.getByText("Invites are under development")).toBeInTheDocument();
  });

  it("disables search controls on non-users tabs", async () => {
    const user = userEvent.setup();
    render(<DirectoryDashboardContent />);

    await user.click(screen.getByRole("tab", { name: "Invites" }));

    expect(screen.getByLabelText("Search for users")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("filters users when search is submitted", async () => {
    const user = userEvent.setup();
    render(<DirectoryDashboardContent />);

    await screen.findByText("Ada Lovelace");

    fireEvent.change(screen.getByLabelText("Search for users"), {
      target: { value: "grace" },
    });
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });
});
