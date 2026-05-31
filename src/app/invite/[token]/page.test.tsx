import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { InvitePreview } from "@/components/invite/InvitePreview";
import { useAuth, useInvite } from "@xynes/auth-sdk";

// Mock the hooks
// Mock the hooks
vi.mock("@xynes/auth-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xynes/auth-sdk")>();
  return {
    ...actual,
    useAuth: vi.fn(),
    useInvite: vi.fn(),
  };
});

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParamsGet = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  useSearchParams: vi.fn(() => ({
    get: mockSearchParamsGet,
  })),
}));

// Mock environment variables
vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:4000");

describe("InvitePreview", () => {
  const mockInvite = {
    id: "invite-123",
    token: "test-token",
    workspaceId: "workspace-123",
    workspaceName: "Test Workspace",
    inviterName: "John Doe",
    inviterEmail: "john@example.com",
    inviteeEmail: "jane@example.com",
    role: "workspace_member" as const,
    status: "pending" as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamsGet.mockReturnValue(null);
    mockPush.mockReset();
  });

  it("renders loading state initially", () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: true,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/Join Workspace/i)).toBeInTheDocument();
    expect(
      screen.getByText(/You have been invited to join a workspace/i),
    ).toBeInTheDocument();
    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
  });

  it("renders invite details when authenticated", () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: true,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(mockInvite.workspaceName)).toBeInTheDocument();
    expect(screen.getByText(mockInvite.inviterName)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(mockInvite.inviterEmail)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(mockInvite.role.replace("_", " "), "i")),
    ).toBeInTheDocument();
    expect(screen.getByText(/You are signed in as/i)).toBeInTheDocument();
  });

  it("renders invite role from roleKey when role is missing", () => {
    const inviteWithRoleKeyOnly = {
      ...mockInvite,
      role: undefined,
      roleKey: "workspace_member" as const,
    } as unknown as typeof mockInvite;

    const useInviteMock = vi.fn().mockReturnValue({
      invite: inviteWithRoleKeyOnly,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: true,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/workspace member/i)).toBeInTheDocument();
  });

  it("renders invite details from envelope-shaped response payload", () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: {
        ok: true,
        data: {
          workspaceName: "Acme Workspace",
          inviterName: "Owner User",
          roleKey: "workspace_member",
          status: "pending",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/Acme Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Owner User/i)).toBeInTheDocument();
    expect(screen.getByText(/workspace member/i)).toBeInTheDocument();
  });

  it("renders invite details when not authenticated", () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(mockInvite.workspaceName)).toBeInTheDocument();
    expect(screen.getByText(mockInvite.inviterName)).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(mockInvite.inviterEmail)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(mockInvite.role.replace("_", " "), "i")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sign in to accept this invitation/i),
    ).toBeInTheDocument();
  });

  it("shows error when invite is expired", () => {
    const expiredInvite = {
      ...mockInvite,
      status: "expired" as const,
    };

    const useInviteMock = vi.fn().mockReturnValue({
      invite: expiredInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/Invite Not Valid/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This invitation has expired./i),
    ).toBeInTheDocument();
  });

  it("shows error when invite is cancelled", () => {
    const cancelledInvite = {
      ...mockInvite,
      status: "cancelled" as const,
    };

    const useInviteMock = vi.fn().mockReturnValue({
      invite: cancelledInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/Invite Not Valid/i)).toBeInTheDocument();
    expect(
      screen.getByText(/This invitation has been cancelled./i),
    ).toBeInTheDocument();
  });

  it("shows error when API returns a generic error", () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: false,
      error: { code: "unknown_error", message: "Something went wrong" },
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByTestId("error-state")).toBeInTheDocument();
  });

  it("shows customized error when invite is not found", () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: false,
      error: { code: "invite_not_found", message: "Not Found" },
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/Invite Not Valid/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /The invitation code could not be found or has expired./i,
      ),
    ).toBeInTheDocument();
  });

  it("shows customized error when user is already a member", () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: false,
      error: { code: "already_in_workspace", message: "Already Member" },
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: true,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(
      screen.getByRole("heading", { name: /Already a Member/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/You are already a member of this workspace./i),
    ).toBeInTheDocument();
  });

  it("calls acceptInvite when authenticated user clicks join button", async () => {
    const mockAcceptInvite = vi.fn().mockResolvedValue(mockInvite);

    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: mockAcceptInvite,
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: true,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    const joinButton = screen.getByRole("button", { name: /Join Workspace/i });
    joinButton.click();

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalled();
    });
  });

  it("redirects to /dashboard/apps after accept when API response has no workspace slug", async () => {
    const mockAcceptInvite = vi.fn().mockResolvedValue({
      accepted: true,
      workspaceId: "workspace-123",
      roleKey: "workspace_member",
      workspaceMemberCreated: true,
    });

    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: mockAcceptInvite,
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: true,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    const joinButton = screen.getByRole("button", { name: /Join Workspace/i });
    joinButton.click();

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/dashboard/apps");
    });
  });

  it("redirects to login when unauthenticated user clicks sign in button", () => {
    const mockRedirectToLogin = vi.fn();

    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: mockRedirectToLogin,
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    const signInButton = screen.getByRole("button", {
      name: /Sign In to Continue/i,
    });
    signInButton.click();

    expect(mockRedirectToLogin).toHaveBeenCalledWith(
      `/invite/test-token?autoAccept=true`,
    );
  });

  it("automatically accepts invite when authenticated and autoAccept param is true", async () => {
    mockSearchParamsGet.mockReturnValue("true");
    const mockAcceptInvite = vi.fn().mockResolvedValue(mockInvite);

    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: mockAcceptInvite,
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: true,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalled();
    });
  });

  describe("BUG-AUTH-4 — auto-accept recovery surface", () => {
    it('does NOT render the generic "unexpected error" state when acceptInvite resolves with a workspace (SDK recovery path)', async () => {
      mockSearchParamsGet.mockReturnValue("true");

      // BUG-AUTH-4: the SDK's acceptInvite now silently recovers when a
      // refresh-token side-effect fires DURING the accept POST but the
      // join actually succeeded on the backend. From the InvitePreview
      // perspective this is indistinguishable from a normal success:
      // `acceptInvite` resolves with the workspace, `error` is null.
      const recoveredWorkspace = {
        id: "workspace-123",
        name: "Test Workspace",
        slug: "test-workspace",
        planType: "free" as const,
        role: "workspace_member" as const,
      };
      const mockAcceptInvite = vi.fn().mockResolvedValue(recoveredWorkspace);

      const useInviteMock = vi.fn().mockReturnValue({
        invite: mockInvite,
        isLoading: false,
        error: null, // <-- key: no error surfaced even though Supabase complained internally
        acceptInvite: mockAcceptInvite,
        isAccepting: false,
      });

      const useAuthMock = vi.fn().mockReturnValue({
        isAuthenticated: true,
        redirectToLogin: vi.fn(),
      });

      vi.mocked(useInvite).mockImplementation(useInviteMock);
      vi.mocked(useAuth).mockImplementation(useAuthMock);

      renderWithProviders(<InvitePreview token="test-token" />);

      await waitFor(() => {
        expect(mockAcceptInvite).toHaveBeenCalled();
      });

      // BUG-AUTH-4 invariant: the user must NOT see the generic
      // "unexpected error" Alert that the bug reporter saw.
      expect(
        screen.queryByText(/An unexpected error occurred/i),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    });

    it("surfaces a session_expired error (NOT unknown_error) when the SDK confirms the join failed", () => {
      mockSearchParamsGet.mockReturnValue("true");

      // The SDK's acceptInvite ran its recovery check and confirmed the
      // join did NOT happen, so it sets `error.code = 'session_expired'`.
      // The InvitePreview must surface this as an actionable error
      // state (existing error rendering covers any non-null error).
      const useInviteMock = vi.fn().mockReturnValue({
        invite: mockInvite,
        isLoading: false,
        error: {
          code: "session_expired",
          message: "Your session has expired. Please sign in again.",
        },
        acceptInvite: vi.fn().mockResolvedValue(null),
        isAccepting: false,
      });

      const useAuthMock = vi.fn().mockReturnValue({
        isAuthenticated: true,
        redirectToLogin: vi.fn(),
      });

      vi.mocked(useInvite).mockImplementation(useInviteMock);
      vi.mocked(useAuth).mockImplementation(useAuthMock);

      renderWithProviders(<InvitePreview token="test-token" />);

      // Error state appears with the session-expired copy.
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
      expect(
        screen.getByText(/Your session has expired\. Please sign in again\./i),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/An unexpected error occurred/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("BUG-AUTH-10 — invite identity mismatch", () => {
    const SIGNED_IN_USER = {
      id: "user-archan",
      email: "archan@safarnama.city",
      displayName: "Archan",
      avatarUrl: null,
      emailVerified: true,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01",
    };

    // Reproduces the bug report exactly: invite issued for
    // archan.ray2011@gmail.com, but the user is signed in as
    // archan@safarnama.city.
    const inviteForOtherEmail = {
      ...mockInvite,
      inviteeEmail: "archan.ray2011@gmail.com",
    };

    it("renders the signed-in user's email (NOT the invitee email) on the 'You are signed in as' line when the emails match", () => {
      const matchingInvite = {
        ...mockInvite,
        inviteeEmail: SIGNED_IN_USER.email,
      };
      const mockAcceptInvite = vi.fn();

      vi.mocked(useInvite).mockReturnValue({
        invite: matchingInvite,
        isLoading: false,
        error: null,
        acceptInvite: mockAcceptInvite,
        isAccepting: false,
      });
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: SIGNED_IN_USER,
        redirectToLogin: vi.fn(),
        // The rest of the AuthContextValue surface is unused by the
        // component; we narrow to what the production-time mock would
        // expose. The test runtime accepts a partial object because the
        // mock module is virtual.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<InvitePreview token="test-token" />);

      // Happy path: warning is NOT rendered, Join button IS rendered,
      // and the signed-in line shows the signed-in user's email.
      expect(
        screen.queryByTestId("invite-wrong-account-warning"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("invite-wrong-account-cta"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Join Workspace/i }),
      ).toBeInTheDocument();

      const signedInLine = screen.getByTestId("invite-signed-in-as");
      // BUG-AUTH-10 invariant: the signed-in line carries the user's
      // own email, not the invitee email.
      expect(signedInLine).toHaveTextContent(SIGNED_IN_USER.email);
      expect(signedInLine).not.toHaveTextContent(
        inviteForOtherEmail.inviteeEmail,
      );
    });

    it("renders the wrong-account warning Alert with BOTH emails when the signed-in user's email does NOT match the invitee email", () => {
      vi.mocked(useInvite).mockReturnValue({
        invite: inviteForOtherEmail,
        isLoading: false,
        error: null,
        acceptInvite: vi.fn(),
        isAccepting: false,
      });
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: SIGNED_IN_USER,
        redirectToLogin: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<InvitePreview token="test-token" />);

      // BUG-AUTH-10 invariant: warning Alert is rendered.
      const warning = screen.getByTestId("invite-wrong-account-warning");
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveAttribute("role", "alert");

      // Both emails appear in the warning copy.
      expect(warning).toHaveTextContent(inviteForOtherEmail.inviteeEmail);
      expect(warning).toHaveTextContent(SIGNED_IN_USER.email);
      expect(warning.textContent).toMatch(/different email address/i);

      // The Join button is replaced by the "Sign in with correct
      // account" CTA — Join MUST be entirely absent so the user cannot
      // fire a request the backend will reject.
      expect(
        screen.queryByRole("button", { name: /Join Workspace/i }),
      ).not.toBeInTheDocument();
      const cta = screen.getByTestId("invite-wrong-account-cta");
      expect(cta).toBeInTheDocument();
      expect(cta).toHaveTextContent(/Sign in with correct account/i);

      // The "You are signed in as" line is NOT rendered in the
      // mismatch path — the warning carries the same information in a
      // more actionable shape.
      expect(
        screen.queryByTestId("invite-signed-in-as"),
      ).not.toBeInTheDocument();
    });

    it("does NOT auto-accept when the autoAccept query param is true but the emails do not match", async () => {
      mockSearchParamsGet.mockReturnValue("true");
      const mockAcceptInvite = vi.fn().mockResolvedValue(null);

      vi.mocked(useInvite).mockReturnValue({
        invite: inviteForOtherEmail,
        isLoading: false,
        error: null,
        acceptInvite: mockAcceptInvite,
        isAccepting: false,
      });
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: SIGNED_IN_USER,
        redirectToLogin: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<InvitePreview token="test-token" />);

      // Give the auto-accept effect a chance to fire so we are not
      // making a vacuous "not called yet" assertion.
      await new Promise((resolve) => setTimeout(resolve, 50));

      // BUG-AUTH-10 invariant: auto-accept is gated by `!isEmailMismatch`
      // so the backend never sees the request, the user never sees a
      // generic "Unexpected error occurred." toast, and the wrong-account
      // warning UI surfaces instead.
      expect(mockAcceptInvite).not.toHaveBeenCalled();
      expect(
        screen.getByTestId("invite-wrong-account-warning"),
      ).toBeInTheDocument();
    });

    it("upgrades the in-card error UI to the wrong-account warning when the SDK surfaces invite_email_mismatch (post-click defense)", () => {
      // Simulates the case where the user reached Join before the
      // pre-flight guard caught them (e.g. user object loaded after the
      // first render, or the user clicked while the auth state was
      // hydrating). The SDK now returns
      // `error.code = 'invite_email_mismatch'`, and InvitePreview
      // upgrades the rendering from the destructive Alert to the
      // actionable warning + CTA.
      vi.mocked(useInvite).mockReturnValue({
        invite: inviteForOtherEmail,
        isLoading: false,
        error: {
          code: "invite_email_mismatch",
          message:
            "This invitation was sent to a different email address. Please sign in with the invited account.",
        },
        acceptInvite: vi.fn(),
        isAccepting: false,
      });
      vi.mocked(useAuth).mockReturnValue({
        isAuthenticated: true,
        user: SIGNED_IN_USER,
        redirectToLogin: vi.fn(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithProviders(<InvitePreview token="test-token" />);

      // The error-state container is still rendered (preserves the
      // existing testid contract for the error path), but the
      // destructive variant + generic copy are replaced.
      const errorState = screen.getByTestId("error-state");
      expect(errorState).toBeInTheDocument();
      expect(errorState).toHaveTextContent(/different email address/i);
      // Defense in depth: the generic unknown-error copy must NOT
      // appear (this is the bug report's exact failure mode).
      expect(
        screen.queryByText(/An unexpected error occurred/i),
      ).not.toBeInTheDocument();

      // CTA is wired so the user can recover.
      expect(
        screen.getByTestId("invite-wrong-account-cta"),
      ).toBeInTheDocument();
    });
  });
});
