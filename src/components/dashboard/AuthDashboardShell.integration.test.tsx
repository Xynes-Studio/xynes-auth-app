import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { DashboardShellProps } from "@lumia-ui/layout";
import { AuthDashboardShell } from "./AuthDashboardShell";

const mockUseAuth = vi.fn();
const mockUseWorkspace = vi.fn();
const mockPush = vi.fn();
const mockDashboardShell = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/apps",
}));

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => mockUseAuth(),
  useWorkspace: () => mockUseWorkspace(),
}));

vi.mock(
  "@lumia-ui/layout",
  () => ({
  DashboardShell: (props: DashboardShellProps) => {
    mockDashboardShell(props);
    return <div data-testid="lumia-dashboard-shell">{props.children}</div>;
  },
}),
);

describe("AuthDashboardShell", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockDashboardShell.mockReset();

    mockUseAuth.mockReturnValue({
      user: {
        displayName: "Archie",
        email: "archie@xynes.com",
        avatarUrl: null,
      },
      workspaces: [
        {
          id: "ws-1",
          name: "Xynes",
          slug: "xynes",
        },
        {
          id: "ws-2",
          name: "Lumia",
          slug: "lumia",
        },
      ],
    });

    mockUseWorkspace.mockReturnValue({
      currentWorkspace: {
        id: "ws-1",
        name: "Xynes",
        slug: "xynes",
      },
      selectWorkspace: vi.fn(),
    });
  });

  it("uses Lumia DashboardShell with required nav, workspace, and profile data", () => {
    render(
      <AuthDashboardShell activeNav="apps" profileSubtitle="Designation">
        <div>Dashboard body</div>
      </AuthDashboardShell>,
    );

    expect(mockDashboardShell).toHaveBeenCalledWith(
      expect.objectContaining({
        activePath: "/dashboard/apps",
        navItems: expect.arrayContaining([
          expect.objectContaining({ label: "Apps", href: "/dashboard/apps" }),
          expect.objectContaining({ label: "Directory" }),
          expect.objectContaining({ label: "Access Control" }),
          expect.objectContaining({ label: "Security" }),
          expect.objectContaining({ label: "Integrations" }),
          expect.objectContaining({ label: "Logs" }),
          expect.objectContaining({ label: "Billing" }),
          expect.objectContaining({ label: "Settings" }),
        ]),
        workspace: expect.objectContaining({ id: "ws-1", name: "Xynes" }),
        userMenu: expect.objectContaining({
          name: "Archie",
          email: "Designation",
        }),
      }),
    );
  });

  it("passes workspace callbacks and supports logout navigation", () => {
    const onWorkspaceSelect = vi.fn();
    const onCreateNew = vi.fn();

    render(
      <AuthDashboardShell
        activeNav="settings"
        workspaceSwitcherProps={{ onWorkspaceSelect, onCreateNew }}
      >
        <div>Settings content</div>
      </AuthDashboardShell>,
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;

    props.onWorkspaceSelect("ws-2");
    expect(onWorkspaceSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ws-2", name: "Lumia" }),
    );

    props.onCreateWorkspace?.();
    expect(onCreateNew).toHaveBeenCalled();

    props.onLogout();
    expect(mockPush).toHaveBeenCalledWith("/logout");
  });
});
