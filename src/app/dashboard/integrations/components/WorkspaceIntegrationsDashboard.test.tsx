import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceIntegrationsDashboard } from "./WorkspaceIntegrationsDashboard";
// IMPORTANT: import the error class from the mocked module so `instanceof`
// checks inside the container resolve to the same class the tests use.
import { WorkspaceIntegrationsApiError } from "@/lib/integrations/workspace-integrations-client";
import type {
  WorkspaceApiKey,
  WorkspaceDomain,
} from "@/lib/integrations/workspace-integrations-types";

const mockListWorkspaceDomains = vi.fn();
const mockListWorkspaceApiKeys = vi.fn();

const workspaceState = vi.hoisted(() => ({
  currentWorkspace: {
    id: "ws-1",
    name: "Xynes",
    slug: "xynes",
  } as { id: string; name: string; slug: string } | null,
}));

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => ({
    getAccessToken: async () => "token",
  }),
  useWorkspace: () => ({
    currentWorkspace: workspaceState.currentWorkspace,
  }),
}));

vi.mock("@/lib/integrations/workspace-integrations-client", () => {
  // Mirror the real exported error class so `instanceof` checks in the
  // container's `getIntegrationsLoadErrorMessage` still narrow correctly.
  class WorkspaceIntegrationsApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string) {
      super(message);
      this.name = "WorkspaceIntegrationsApiError";
      this.statusCode = statusCode;
    }
  }
  return {
    WorkspaceIntegrationsApiError,
    listWorkspaceDomains: (...args: unknown[]) =>
      mockListWorkspaceDomains(...args),
    listWorkspaceApiKeys: (...args: unknown[]) =>
      mockListWorkspaceApiKeys(...args),
    registerWorkspaceDomain: vi.fn(),
    verifyWorkspaceDomain: vi.fn(),
    deleteWorkspaceDomain: vi.fn(),
    createWorkspaceApiKey: vi.fn(),
    revokeWorkspaceApiKey: vi.fn(),
  };
});

vi.mock("@lumia-ui/components", () => ({
  // Spread *all* HTML attributes so role/aria-* pass through and accessibility
  // queries like getByRole("region", { name: ... }) work.
  Card: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card" {...rest}>
      {children}
    </div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children, id }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 id={id}>{children}</h2>
  ),
  CardDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  Alert: ({
    children,
    variant,
    title,
  }: {
    children?: React.ReactNode;
    variant?: string;
    title?: React.ReactNode;
  }) => (
    <div role="alert" data-variant={variant}>
      {title ? <strong>{title}</strong> : null}
      {children}
    </div>
  ),
  Button: ({
    children,
    onClick,
    type,
    disabled,
    "aria-label": ariaLabel,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  ),
  Spinner: () => <div role="status">Loading…</div>,
  Flex: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
  PageHeader: ({
    title,
    description,
    children,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
    </header>
  ),
}));

const sampleDomain: WorkspaceDomain = {
  id: "dom-1",
  hostname: "example.com",
  status: "verified",
  verificationMethod: "dns_txt",
  verificationName: "_xynes.example.com",
  verifiedAt: "2026-04-01T00:00:00.000Z",
};

const sampleApiKey: WorkspaceApiKey = {
  id: "key-1",
  name: "Test key",
  keyPrefix: "abcd1234",
  status: "active",
  presetKey: "cms_readonly",
  createdAt: "2026-04-15T00:00:00.000Z",
};

beforeEach(() => {
  workspaceState.currentWorkspace = {
    id: "ws-1",
    name: "Xynes",
    slug: "xynes",
  };
  mockListWorkspaceDomains.mockReset();
  mockListWorkspaceApiKeys.mockReset();
  mockListWorkspaceDomains.mockResolvedValue([sampleDomain]);
  mockListWorkspaceApiKeys.mockResolvedValue([sampleApiKey]);
});

describe("WorkspaceIntegrationsDashboard", () => {
  it("renders the workspace context, domains section, and api keys section", async () => {
    render(<WorkspaceIntegrationsDashboard />);

    expect(
      screen.getByRole("heading", { name: /integrations/i }),
    ).toBeInTheDocument();

    // Workspace context surfaced for unambiguous active-workspace context.
    expect(
      screen.getByTestId("workspace-integrations-workspace-slug"),
    ).toHaveTextContent("xynes");

    // Both sections render with accessible names tied to their headings.
    expect(
      screen.getByRole("region", { name: /verified domains/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: /workspace api keys/i }),
    ).toBeInTheDocument();

    // The under-development placeholder must be gone.
    expect(screen.queryByText(/under development/i)).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockListWorkspaceDomains).toHaveBeenCalled();
      expect(mockListWorkspaceApiKeys).toHaveBeenCalled();
    });
  });

  it("loads domains and api keys for the active workspace via the gateway client", async () => {
    render(<WorkspaceIntegrationsDashboard />);

    await waitFor(() => {
      expect(mockListWorkspaceDomains).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-1",
          apiBaseUrl: "https://api.test.com",
        }),
      );
      expect(mockListWorkspaceApiKeys).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-1",
          apiBaseUrl: "https://api.test.com",
        }),
      );
    });

    // Loaded data renders inside the section (panel-level rendering lands in
    // Tasks 3/4; the container exposes counts so the tests can assert without
    // depending on panel internals).
    expect(
      screen.getByTestId("workspace-integrations-domains-count"),
    ).toHaveTextContent("1");
    expect(
      screen.getByTestId("workspace-integrations-api-keys-count"),
    ).toHaveTextContent("1");
  });

  it("renders an accessible loading state while data is in flight", async () => {
    let resolveDomains!: (value: WorkspaceDomain[]) => void;
    let resolveKeys!: (value: WorkspaceApiKey[]) => void;
    mockListWorkspaceDomains.mockReturnValueOnce(
      new Promise<WorkspaceDomain[]>((resolve) => {
        resolveDomains = resolve;
      }),
    );
    mockListWorkspaceApiKeys.mockReturnValueOnce(
      new Promise<WorkspaceApiKey[]>((resolve) => {
        resolveKeys = resolve;
      }),
    );

    render(<WorkspaceIntegrationsDashboard />);

    // Status region with aria-live so SR users hear the load progress.
    const liveRegion = await screen.findByTestId(
      "workspace-integrations-loading",
    );
    expect(liveRegion).toHaveAttribute("aria-live", "polite");
    expect(liveRegion).toHaveAttribute("role", "status");

    resolveDomains([]);
    resolveKeys([]);

    await waitFor(() => {
      expect(
        screen.queryByTestId("workspace-integrations-loading"),
      ).not.toBeInTheDocument();
    });
  });

  it("renders an error state with a retry action when the domains fetch fails", async () => {
    const user = userEvent.setup();
    // Default both mocks first; then queue a one-shot rejection on domains.
    mockListWorkspaceDomains.mockReset();
    mockListWorkspaceApiKeys.mockReset();
    mockListWorkspaceDomains.mockResolvedValue([sampleDomain]);
    mockListWorkspaceApiKeys.mockResolvedValue([sampleApiKey]);
    mockListWorkspaceDomains.mockRejectedValueOnce(
      new WorkspaceIntegrationsApiError(500, "boom"),
    );

    render(<WorkspaceIntegrationsDashboard />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/failed to load workspace integrations/i);

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeEnabled();
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
    // The retry call uses the resolved default → no more failures.
    expect(mockListWorkspaceDomains.mock.calls.length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("renders a permission-denied error message for 403 responses", async () => {
    mockListWorkspaceApiKeys.mockRejectedValueOnce(
      new WorkspaceIntegrationsApiError(403, "permission denied"),
    );

    render(<WorkspaceIntegrationsDashboard />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      /you don.?t have permission to manage workspace integrations/i,
    );
  });

  it("shows an unavailable state when no workspace is selected", () => {
    workspaceState.currentWorkspace = null;

    render(<WorkspaceIntegrationsDashboard />);

    expect(screen.getByText(/no workspace selected/i)).toBeInTheDocument();
    // The client must NOT be called without a workspace id.
    expect(mockListWorkspaceDomains).not.toHaveBeenCalled();
    expect(mockListWorkspaceApiKeys).not.toHaveBeenCalled();
  });

  it("does not render the old under-development panel anywhere", async () => {
    render(<WorkspaceIntegrationsDashboard />);

    expect(
      screen.queryByText(/integrations are under development/i),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      expect(mockListWorkspaceDomains).toHaveBeenCalled();
    });
  });
});
