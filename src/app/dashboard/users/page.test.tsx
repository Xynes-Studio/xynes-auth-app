import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { WorkspaceRole } from "@xynes/auth-sdk";
import UsersDashboardPage from "./page";

const mockAuthState = {
  user: {
    id: "user-1",
    email: "me@xynes.com",
    displayName: "Ada Lovelace",
    avatarUrl: null,
    emailVerified: true,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
  },
  workspaces: [
    {
      id: "ws-1",
      name: "Xynes",
      slug: "xynes",
      planType: "pro",
      role: "workspace_owner" as WorkspaceRole,
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01",
    },
  ],
  isLoading: false,
};

const mockWorkspaceState = {
  currentWorkspace: mockAuthState.workspaces[0],
  isLoading: false,
  selectWorkspace: vi.fn(),
  clearWorkspace: vi.fn(),
};

const formatWorkspaceRole = (role: string) =>
  role.replace("workspace_", "").toUpperCase();

vi.mock("@xynes/auth-sdk", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthState,
  useWorkspace: () => mockWorkspaceState,
  formatWorkspaceRole: (role: string) => formatWorkspaceRole(role),
}));

vi.mock("@lumia-ui/components", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    id,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
  }) => (
    <input
      id={id}
      aria-label="Search users"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Avatar: () => <span data-testid="avatar" />,
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  Spinner: () => <div>Loading</div>,
  Flex: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/dashboard", () => ({
  AuthDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/lib/users/workspace-members", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/lib/users/workspace-members")>();
  return {
    ...mod,
  };
});

describe("UsersDashboardPage", () => {
  beforeEach(() => {
    mockAuthState.isLoading = false;
    mockWorkspaceState.isLoading = false;
  });

  it("renders current user and role badge", () => {
    render(<UsersDashboardPage />);

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("OWNER")).toBeInTheDocument();
  });

  it("filters members via search input", () => {
    render(<UsersDashboardPage />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    const input = screen.getByLabelText(/search users/i);
    fireEvent.change(input, { target: { value: "nope" } });

    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("shows loading state when auth is loading", () => {
    mockAuthState.isLoading = true;

    render(<UsersDashboardPage />);

    expect(screen.getByText("Loading")).toBeInTheDocument();
  });
});
