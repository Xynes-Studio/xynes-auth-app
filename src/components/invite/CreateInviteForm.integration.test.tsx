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
  Alert: ({ description }: { description: string }) => <div>{description}</div>,
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

    expect(await screen.findByText(/invite created/i)).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(/\/invite\/xyn_inv_testtoken/i),
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

    expect(await screen.findByText(/cannot invite yourself/i)).toBeInTheDocument();
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
});
