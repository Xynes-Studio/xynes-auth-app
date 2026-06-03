import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Minimal mocks for next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock Lumia components to basic HTML controls
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

type CardProps = {
  children: ReactNode;
};

type InputProps = InputHTMLAttributes<HTMLInputElement>;

vi.mock("@lumia-ui/components", () => ({
  Alert: ({ title, description }: { title?: string; description: string }) => (
    <div>
      {title ? <strong>{title}</strong> : null}
      <span>{description}</span>
    </div>
  ),
  Button: ({ children, ...props }: ButtonProps) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children }: CardProps) => <div>{children}</div>,
  CardHeader: ({ children }: CardProps) => <div>{children}</div>,
  CardTitle: ({ children }: CardProps) => <h2>{children}</h2>,
  CardDescription: ({ children }: CardProps) => <p>{children}</p>,
  CardContent: ({ children }: CardProps) => <div>{children}</div>,
  CardFooter: ({ children }: CardProps) => <div>{children}</div>,
  Input: (props: InputProps) => <input {...props} />,
}));

let mockWorkspaceRole: "workspace_owner" | "workspace_member" =
  "workspace_owner";

// Partial mock auth-sdk hooks used by the component
vi.mock("@xynes/auth-sdk", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useAuth: () => ({
      isAuthenticated: true,
      getAccessToken: vi.fn(async () => "test-token"),
    }),
    useWorkspace: () => ({
      currentWorkspace: {
        id: "ws_1",
        name: "Acme",
        slug: "acme",
        role: mockWorkspaceRole,
        planType: "free",
        createdAt: "",
        updatedAt: "",
      },
      isLoading: false,
    }),
  };
});

// Mock fetch for API calls (AccountsClient uses global fetch)
const mockFetch = vi.fn();
beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

import { CreateInviteForm } from "./CreateInviteForm";

describe("CreateInviteForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWorkspaceRole = "workspace_owner";
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        ok: true,
        data: {
          id: "inv_1",
          workspaceId: "ws_1",
          email: "colleague@example.com",
          roleKey: "workspace_member",
          status: "pending",
          expiresAt: "2026-02-10T12:00:00.000Z",
          token: "xyn_inv_testtoken",
        },
      }),
    });
  });

  it("renders the invite form", () => {
    render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);

    expect(
      screen.getByRole("heading", { name: /invite a teammate/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send invite/i }),
    ).toBeInTheDocument();
  });

  it("creates an invite and shows a copyable link", async () => {
    const user = userEvent.setup();
    render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);

    await user.type(screen.getByLabelText(/email/i), "colleague@example.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:4100/workspaces/ws_1/invites",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // MAIL-6: success Alert uses the localized title from auth.invite.create.success.title
    expect(await screen.findByText(/invitation sent/i)).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/\/invite\/xyn_inv_testtoken/i),
    ).toBeInTheDocument();
    // The localized body mentions the invitee email (ICU interpolation).
    expect(screen.getByText(/colleague@example\.com/i)).toBeInTheDocument();
    // Copy-link secondary helper text is present.
    expect(
      screen.getByText(/didn['’]t arrive\? copy the link/i),
    ).toBeInTheDocument();
  });

  it("disables invite sending for non-owners", () => {
    mockWorkspaceRole = "workspace_member";
    render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);
    expect(
      screen.getByText(/only workspace owners can invite/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send invite/i })).toBeDisabled();
  });

  // ── BUG-AUTH-8: SELF_INVITE + ALREADY_MEMBER error mapping ────────────

  it("surfaces SELF_INVITE error with localized copy when backend rejects self-invite", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        ok: false,
        error: {
          code: "SELF_INVITE",
          // Backend message is deliberately distinct from the FE copy to
          // prove the form NEVER echoes the backend's English text.
          message: "Cannot invite yourself to this workspace",
        },
        meta: { requestId: "req-test" },
      }),
    });

    render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);
    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    expect(
      await screen.findByText(/cannot invite yourself/i),
    ).toBeInTheDocument();
    // Defense in depth: the backend message text must NOT appear in the UI.
    expect(
      screen.queryByText(/cannot invite yourself to this workspace/i),
    ).not.toBeInTheDocument();
    // The generic fallback copy must NOT appear.
    expect(
      screen.queryByText(/failed to create invite/i),
    ).not.toBeInTheDocument();
  });

  it("surfaces ALREADY_MEMBER error with localized copy when invitee is already a member", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        ok: false,
        error: {
          code: "ALREADY_MEMBER",
          message: "This person is already a workspace member",
        },
        meta: { requestId: "req-test" },
      }),
    });

    render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);
    await user.type(screen.getByLabelText(/email/i), "colleague@example.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    expect(
      await screen.findByText(/already a workspace member/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/failed to create invite/i),
    ).not.toBeInTheDocument();
  });

  it("falls back to the generic error message when the backend returns an unknown code", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "boom",
        },
        meta: { requestId: "req-test" },
      }),
    });

    render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);
    await user.type(screen.getByLabelText(/email/i), "colleague@example.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    expect(
      await screen.findByText(/failed to create invite/i),
    ).toBeInTheDocument();
    // Backend's raw "boom" string must NOT bleed through.
    expect(screen.queryByText(/boom/i)).not.toBeInTheDocument();
  });

  it("surfaces the forbidden message when the backend returns the FORBIDDEN closed-set code", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({
        ok: false,
        error: {
          code: "FORBIDDEN",
          // Backend message text must NOT bleed through into the UI.
          message: "Access denied",
        },
        meta: { requestId: "req-test" },
      }),
    });

    render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);
    await user.type(screen.getByLabelText(/email/i), "colleague@example.com");
    await user.click(screen.getByRole("button", { name: /send invite/i }));

    expect(
      await screen.findByText(/don[’']t have permission to create invites/i),
    ).toBeInTheDocument();
    // Defense in depth: backend "Access denied" string must NOT appear.
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
    // Generic fallback must NOT have fired.
    expect(
      screen.queryByText(/failed to create invite/i),
    ).not.toBeInTheDocument();
  });

  // ── MAIL-6: Resend affordance ─────────────────────────────────────────

  describe("MAIL-6 — Resend invite affordance", () => {
    // Helper: create the invite first so the test starts in the success state.
    async function createInvite() {
      const user = userEvent.setup();
      render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);
      await user.type(screen.getByLabelText(/email/i), "colleague@example.com");
      await user.click(screen.getByRole("button", { name: /send invite/i }));
      await screen.findByText(/invitation sent/i);
      return { user };
    }

    it("renders the Resend button, the confirm hint, and the copy-link secondary text", async () => {
      await createInvite();

      expect(
        screen.getByRole("button", { name: /^resend invite$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/sending will invalidate the previous link/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/didn['’]t arrive\? copy the link/i),
      ).toBeInTheDocument();
    });

    it("calls POST /workspaces/{wsId}/invites/{inviteId}/resend and shows the success alert", async () => {
      const { user } = await createInvite();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            inviteId: "inv_1",
            emailAttempts: 2,
            emailSentAt: "2026-06-03T12:00:00.000Z",
            lastEmailErrorCode: null,
          },
        }),
      });

      await user.click(
        screen.getByRole("button", { name: /^resend invite$/i }),
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:4100/workspaces/ws_1/invites/inv_1/resend",
          expect.objectContaining({ method: "POST" }),
        );
      });

      expect(
        await screen.findByText(
          /invitation re-sent\. the previous link has been invalidated/i,
        ),
      ).toBeInTheDocument();
    });

    it("disables the Resend button while the request is in-flight and shows the localized 'Resending…' label", async () => {
      const { user } = await createInvite();

      let resolveResend: (value: unknown) => void = () => undefined;
      const pendingPromise = new Promise((res) => {
        resolveResend = res;
      });
      mockFetch.mockReturnValueOnce(pendingPromise);

      await user.click(
        screen.getByRole("button", { name: /^resend invite$/i }),
      );

      // The button label flips to "Resending…" and is disabled.
      const sending = await screen.findByRole("button", {
        name: /resending…/i,
      });
      expect(sending).toBeDisabled();

      resolveResend({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            inviteId: "inv_1",
            emailAttempts: 2,
            emailSentAt: "2026-06-03T12:00:00.000Z",
            lastEmailErrorCode: null,
          },
        }),
      });

      // After completion, the label reverts to "Resend invite".
      await screen.findByText(
        /invitation re-sent\. the previous link has been invalidated/i,
      );
    });

    it("maps RATE_LIMITED closed-set code to the localized rateLimited copy", async () => {
      const { user } = await createInvite();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        headers: {
          get: () => null,
        },
        json: async () => ({
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many resend attempts for this invite",
          },
        }),
      });

      await user.click(
        screen.getByRole("button", { name: /^resend invite$/i }),
      );

      expect(
        await screen.findByText(
          /too many recent resends\. please wait before trying again/i,
        ),
      ).toBeInTheDocument();
      // Defense in depth: backend message text must NOT bleed through.
      expect(
        screen.queryByText(/too many resend attempts for this invite/i),
      ).not.toBeInTheDocument();
    });

    it("maps INVALID_STATE closed-set code to the localized notPending copy", async () => {
      const { user } = await createInvite();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          ok: false,
          error: { code: "INVALID_STATE", message: "Invite is not pending" },
        }),
      });

      await user.click(
        screen.getByRole("button", { name: /^resend invite$/i }),
      );

      expect(
        await screen.findByText(/this invite is no longer pending/i),
      ).toBeInTheDocument();
    });

    it("maps GONE closed-set code to the localized expired copy", async () => {
      const { user } = await createInvite();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
        json: async () => ({
          ok: false,
          error: { code: "GONE", message: "Invite has expired" },
        }),
      });

      await user.click(
        screen.getByRole("button", { name: /^resend invite$/i }),
      );

      expect(
        await screen.findByText(/this invite has expired/i),
      ).toBeInTheDocument();
    });

    it("maps FORBIDDEN_ACTOR_KIND closed-set code to the localized forbidden copy", async () => {
      const { user } = await createInvite();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          ok: false,
          error: {
            code: "FORBIDDEN_ACTOR_KIND",
            message: "API key actors are not allowed",
          },
        }),
      });

      await user.click(
        screen.getByRole("button", { name: /^resend invite$/i }),
      );

      expect(
        await screen.findByText(
          /you don['’]t have permission to resend this invite/i,
        ),
      ).toBeInTheDocument();
    });

    it("falls back to the generic resend copy for unknown error codes", async () => {
      const { user } = await createInvite();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          ok: false,
          error: { code: "INTERNAL_ERROR", message: "boom" },
        }),
      });

      await user.click(
        screen.getByRole("button", { name: /^resend invite$/i }),
      );

      expect(
        await screen.findByText(/failed to resend invite\. please try again/i),
      ).toBeInTheDocument();
      // The closed-set rateLimited copy must NOT fire on an unknown code.
      expect(
        screen.queryByText(/too many recent resends/i),
      ).not.toBeInTheDocument();
      // Backend's raw message must NOT bleed through.
      expect(screen.queryByText(/boom/i)).not.toBeInTheDocument();
    });

    it("does NOT leak the rotated token URL into the rendered UI on resend success", async () => {
      const { user } = await createInvite();

      // Hostile upstream — leak a "new" token through a field we do NOT
      // consume (or through unexpected fields). The normalizer should drop
      // anything outside the documented allowlist.
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          data: {
            inviteId: "inv_1",
            emailAttempts: 2,
            emailSentAt: "2026-06-03T12:00:00.000Z",
            lastEmailErrorCode: null,
            // Hostile fields — must NOT survive into the UI.
            rotatedToken: "xyn_inv_LEAK_ROTATED_TOKEN_DO_NOT_RENDER",
            newInviteUrl:
              "http://malicious.example.com/invite/LEAK_ROTATED_TOKEN_DO_NOT_RENDER",
          },
        }),
      });

      await user.click(
        screen.getByRole("button", { name: /^resend invite$/i }),
      );

      await screen.findByText(
        /invitation re-sent\. the previous link has been invalidated/i,
      );

      // The displayed Invite link must STILL be the original (now-dead) URL.
      // The rotated token must NEVER appear anywhere in the DOM.
      const container = document.body.innerHTML;
      expect(container).not.toContain("LEAK_ROTATED_TOKEN_DO_NOT_RENDER");
      expect(container).not.toContain("malicious.example.com");
      // The displayed link is the original token URL.
      expect(
        screen.getByDisplayValue(/\/invite\/xyn_inv_testtoken/i),
      ).toBeInTheDocument();
    });

    it("formats expiresAt as a locale-aware date string in the success body", async () => {
      const user = userEvent.setup();
      // Override the default mock with a known ISO date.
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          ok: true,
          data: {
            id: "inv_1",
            workspaceId: "ws_1",
            email: "colleague@example.com",
            roleKey: "workspace_member",
            status: "pending",
            // 2026-02-10 in UTC → "February 10, 2026" in en-US Intl dateStyle="long".
            expiresAt: "2026-02-10T12:00:00.000Z",
            token: "xyn_inv_testtoken",
          },
        }),
      });

      render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);
      await user.type(screen.getByLabelText(/email/i), "colleague@example.com");
      await user.click(screen.getByRole("button", { name: /send invite/i }));

      // The Intl-formatted date should appear somewhere in the success body.
      // en-US dateStyle="long" produces "February 10, 2026" — match the year
      // + month words so this stays robust against minor Intl differences.
      const body = await screen.findByText(/february 10, 2026/i);
      expect(body).toBeInTheDocument();
      // The raw ISO should NOT appear — proves the Intl path fired.
      expect(
        screen.queryByText(/2026-02-10T12:00:00\.000Z/),
      ).not.toBeInTheDocument();
    });

    it("falls back to the raw ISO when expiresAt is unparseable", async () => {
      const user = userEvent.setup();
      mockFetch.mockReset();
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          ok: true,
          data: {
            id: "inv_1",
            workspaceId: "ws_1",
            email: "colleague@example.com",
            roleKey: "workspace_member",
            status: "pending",
            expiresAt: "not-a-date",
            token: "xyn_inv_testtoken",
          },
        }),
      });

      render(<CreateInviteForm apiBaseUrl="http://localhost:4100" />);
      await user.type(screen.getByLabelText(/email/i), "colleague@example.com");
      await user.click(screen.getByRole("button", { name: /send invite/i }));

      // The raw value survives in the body because Intl can't parse it.
      const body = await screen.findByText(/not-a-date/i);
      expect(body).toBeInTheDocument();
    });
  });
});
