import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import type { DashboardShellProps } from "@lumia-ui/layout";
import { AuthDashboardShell } from "./AuthDashboardShell";

const mockUseAuth = vi.fn();
const mockUseWorkspace = vi.fn();
const mockPush = vi.fn();
const mockDashboardShell = vi.fn();
const mockSelectWorkspace = vi.fn();
const mockShowToast = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/dashboard/apps",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => mockUseAuth(),
  useWorkspace: () => mockUseWorkspace(),
}));

vi.mock("@lumia-ui/layout", () => ({
  DashboardShell: (props: DashboardShellProps) => {
    mockDashboardShell(props);
    return <div data-testid="lumia-dashboard-shell">{props.children}</div>;
  },
}));

vi.mock("@lumia-ui/components", () => ({
  useToast: () => ({ show: mockShowToast, dismiss: vi.fn() }),
}));

describe("AuthDashboardShell", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockDashboardShell.mockReset();
    mockSelectWorkspace.mockReset();
    mockShowToast.mockReset();

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
      selectWorkspace: mockSelectWorkspace,
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

  it("routes workspace selection, creation, and logout through the canonical Lumia switcher contract (BUG-LDS-2)", () => {
    render(
      <AuthDashboardShell activeNav="settings">
        <div>Settings content</div>
      </AuthDashboardShell>,
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;

    // Selecting a known workspace delegates to the auth SDK context — no
    // app-level override path remains (the legacy WorkspaceSwitcher is only
    // for standalone callers).
    props.onWorkspaceSelect("ws-2");
    expect(mockSelectWorkspace).toHaveBeenCalledWith("ws-2");

    // Unknown ids are a no-op guard.
    mockSelectWorkspace.mockClear();
    props.onWorkspaceSelect("ws-unknown");
    expect(mockSelectWorkspace).not.toHaveBeenCalled();

    // Create routes to the onboarding flow.
    props.onCreateWorkspace?.();
    expect(mockPush).toHaveBeenCalledWith("/onboarding");

    props.onLogout();
    expect(mockPush).toHaveBeenCalledWith("/logout");

    // BUG-AUTH-3b: invoking onLogout also surfaces a success toast so the
    // user gets immediate feedback that the sign-out flow has started; the
    // /logout server route does the actual Supabase signOut + cookie clear
    // + redirect to /login. Asserted in the same test as the navigation
    // because the two are structurally a single user-visible side effect.
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "success",
        title: "You've been signed out.",
        description: "Redirecting you to the login page…",
      }),
    );

    // BUG-AUTH-3a: the avatar-menu Profile action routes to the new /profile
    // placeholder route. Verified here because the assertion is structurally
    // identical to onLogout — both are router pushes mounted on the same
    // Lumia DS user-menu surface.
    mockPush.mockClear();
    props.onProfileOpen?.();
    expect(mockPush).toHaveBeenCalledWith("/profile");
  });

  it("forwards a complete DashboardShellLabels bundle from auth.dashboard catalog (UXR-5)", () => {
    render(
      <AuthDashboardShell activeNav="apps">
        <div>Body</div>
      </AuthDashboardShell>,
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
    const labels = props.labels;

    // Navigation a11y labels
    expect(labels?.navigation?.mainContent).toBe("Dashboard main content");
    expect(labels?.navigation?.sidebar).toBe("Dashboard sidebar");
    expect(labels?.navigation?.dashboardNavigation).toBe(
      "Dashboard navigation",
    );
    expect(labels?.navigation?.openMobileMenu).toBe("Open menu");
    // Workspace switcher labels
    expect(labels?.workspace?.trigger).toBe("Switch workspace");
    expect(labels?.workspace?.currentSection).toBe("Current Workspace");
    expect(labels?.workspace?.switchToSection).toBe("Switch to");
    expect(labels?.workspace?.createAction).toBe("Create new workspace");
    // Profile menu
    expect(labels?.profile?.trigger).toBe("Open profile menu");
    expect(labels?.profile?.profileAction).toBe("Profile");
    expect(labels?.profile?.logoutAction).toBe("Logout");
    // Notifications: ICU patterns are functions that interpolate counts
    expect(labels?.notifications?.tab).toBe("Notifications");
    expect(labels?.notifications?.empty).toBe("No notifications");
    expect(labels?.notifications?.title?.(3)).toBe("Notifications (3)");
    expect(labels?.notifications?.unreadCount?.(5)).toBe(
      "5 unread notifications",
    );
    expect(
      labels?.notifications?.delete?.({
        id: "n1",
        title: "Domain verified",
        description: "",
        createdAt: new Date().toISOString(),
      }),
    ).toBe("Delete notification Domain verified");
  });

  it("localizes navigation labels through the auth.dashboard.navigation namespace (UXR-5)", () => {
    render(
      <AuthDashboardShell activeNav="apps">
        <div>Body</div>
      </AuthDashboardShell>,
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
    // Each nav item's `label` is sourced from the catalog, not a hard-coded
    // English literal. The shape (id/href/icon) is unchanged.
    const labelsByHref = Object.fromEntries(
      props.navItems.map((item) => [item.href, item.label]),
    );
    expect(labelsByHref).toEqual({
      "/dashboard/apps": "Apps",
      "/dashboard/directory": "Directory",
      "/dashboard/access-control": "Access Control",
      "/dashboard/security": "Security",
      "/dashboard/integrations": "Integrations",
      "/dashboard/logs": "Logs",
      "/dashboard/billing": "Billing",
      "/dashboard/settings": "Settings",
    });
  });

  it("forwards workspaceCreationDisabledMessage and sidebarFooterNote from the catalog (UXR-5)", () => {
    render(
      <AuthDashboardShell activeNav="apps">
        <div>Body</div>
      </AuthDashboardShell>,
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
    expect(props.workspaceCreationDisabledMessage).toBe(
      "Workspace creation is unavailable. Check settings or contact admin.",
    );
    expect(props.sidebarFooterNote).toBe(
      "Need access? Contact your workspace owner.",
    );
  });

  it("uses translated user-menu fallbacks when displayName/email/profileSubtitle are missing (UXR-5)", () => {
    mockUseAuth.mockReturnValue({
      user: {
        displayName: null,
        email: null,
        avatarUrl: null,
      },
      workspaces: [],
    });
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: null,
      selectWorkspace: vi.fn(),
    });

    render(
      <AuthDashboardShell activeNav="apps">
        <div>Body</div>
      </AuthDashboardShell>,
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
    expect(props.userMenu).toEqual(
      expect.objectContaining({ name: "User", email: "No email" }),
    );
  });

  describe("BUG-AUTH-3b — logout toast feedback", () => {
    it("surfaces a success toast BEFORE navigating to /logout (ordering)", () => {
      render(
        <AuthDashboardShell activeNav="settings">
          <div>Body</div>
        </AuthDashboardShell>,
      );
      const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;

      props.onLogout();

      // Toast and navigation are both invoked exactly once.
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/logout");

      // Ordering: toast fires before navigation. We compare invocation
      // order via mock.invocationCallOrder so the user sees feedback even
      // if the router push is synchronous (route change happens in a
      // microtask). Smaller order number = earlier call.
      expect(mockShowToast.mock.invocationCallOrder[0]).toBeLessThan(
        mockPush.mock.invocationCallOrder[0],
      );
    });

    it("success toast carries the success variant + i18n-resolved copy + role=status semantics", () => {
      render(
        <AuthDashboardShell activeNav="apps">
          <div>Body</div>
        </AuthDashboardShell>,
      );
      const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
      props.onLogout();

      // variant="success" maps to role="status" inside Lumia's ToastProvider
      // (the design-system contract). We assert variant here because that's
      // what the consumer controls; the role assertion lives in the lumia-ds
      // toast unit tests.
      expect(mockShowToast).toHaveBeenCalledWith({
        variant: "success",
        title: "You've been signed out.",
        description: "Redirecting you to the login page…",
      });
    });

    it("falls back to an error toast and keeps the user on the dashboard if router.push throws", () => {
      // Defensive failure path: the /logout server route is hardened (it
      // always 302s to /login even if Supabase signOut fails server-side),
      // so this branch only fires if the client-side navigation itself
      // throws (extremely rare). We still verify the destructive toast so
      // the user never gets stuck in a silent failure.
      mockPush.mockImplementationOnce(() => {
        throw new Error("Simulated navigation failure");
      });
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      render(
        <AuthDashboardShell activeNav="apps">
          <div>Body</div>
        </AuthDashboardShell>,
      );
      const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
      props.onLogout();

      // Two toasts: success (fired before the throw) AND error (caught and
      // re-surfaced). The user is not stuck — the dashboard stays mounted
      // and the destructive toast tells them to retry.
      expect(mockShowToast).toHaveBeenCalledTimes(2);
      expect(mockShowToast).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ variant: "success" }),
      );
      expect(mockShowToast).toHaveBeenNthCalledWith(2, {
        variant: "error",
        title: "We couldn't sign you out.",
        description: "Check your connection and try again.",
      });

      // Error logged for ops visibility — but never the raw error.message
      // is rendered to the user (closed-set toast copy only).
      expect(consoleError).toHaveBeenCalledWith(
        "[AuthDashboardShell] logout navigation failed",
        expect.any(Error),
      );

      consoleError.mockRestore();
    });
  });
});
