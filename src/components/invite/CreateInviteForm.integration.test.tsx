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
});
