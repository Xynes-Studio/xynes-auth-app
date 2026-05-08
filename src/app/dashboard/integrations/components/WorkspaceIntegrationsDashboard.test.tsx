import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
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
const mockRegisterWorkspaceDomain = vi.fn();
const mockVerifyWorkspaceDomain = vi.fn();
const mockDeleteWorkspaceDomain = vi.fn();
const mockCreateWorkspaceApiKey = vi.fn();
const mockRevokeWorkspaceApiKey = vi.fn();

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
    registerWorkspaceDomain: (...args: unknown[]) =>
      mockRegisterWorkspaceDomain(...args),
    verifyWorkspaceDomain: (...args: unknown[]) =>
      mockVerifyWorkspaceDomain(...args),
    deleteWorkspaceDomain: (...args: unknown[]) =>
      mockDeleteWorkspaceDomain(...args),
    createWorkspaceApiKey: (...args: unknown[]) =>
      mockCreateWorkspaceApiKey(...args),
    revokeWorkspaceApiKey: (...args: unknown[]) =>
      mockRevokeWorkspaceApiKey(...args),
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
  // Additional exports the DomainManagementPanel (Task 3) consumes.
  Input: React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
  >(function Input(props, ref) {
    return <input ref={ref} {...props} />;
  }),
  Select: React.forwardRef<
    HTMLSelectElement,
    React.SelectHTMLAttributes<HTMLSelectElement> & {
      children?: React.ReactNode;
    }
  >(function Select({ children, ...rest }, ref) {
    return (
      <select ref={ref} {...rest}>
        {children}
      </select>
    );
  }),
  Badge: ({
    children,
    variant,
  }: {
    children?: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
  StatusPill: ({
    children,
    variant,
  }: {
    children?: React.ReactNode;
    variant?: string;
  }) => <span data-variant={variant}>{children}</span>,
  InlineAlert: ({
    children,
    variant,
  }: {
    children?: React.ReactNode;
    variant?: string;
  }) => (
    <div role="status" data-variant={variant}>
      {children}
    </div>
  ),
  ConfirmDialog: ({
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    open,
    onOpenChange,
  }: {
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: () => void | Promise<void>;
    open?: boolean;
    onOpenChange?: (next: boolean) => void;
  }) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {description ? <div>{description}</div> : null}
        <button
          type="button"
          onClick={async () => {
            await onConfirm();
            onOpenChange?.(false);
          }}
        >
          {confirmLabel ?? "Confirm"}
        </button>
        <button type="button" onClick={() => onOpenChange?.(false)}>
          {cancelLabel ?? "Cancel"}
        </button>
      </div>
    );
  },
  useConfirmDialog: () => {
    const [open, setOpen] = React.useState(false);
    return {
      open,
      openDialog: () => setOpen(true),
      closeDialog: () => setOpen(false),
      setOpen,
      dialogProps: { open, onOpenChange: setOpen },
    };
  },
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
  mockRegisterWorkspaceDomain.mockReset();
  mockVerifyWorkspaceDomain.mockReset();
  mockDeleteWorkspaceDomain.mockReset();
  mockCreateWorkspaceApiKey.mockReset();
  mockRevokeWorkspaceApiKey.mockReset();
  mockListWorkspaceDomains.mockResolvedValue([sampleDomain]);
  mockListWorkspaceApiKeys.mockResolvedValue([sampleApiKey]);
  mockRegisterWorkspaceDomain.mockResolvedValue({
    domain: {
      ...sampleDomain,
      id: "dom-created",
      hostname: "new.example.com",
      status: "pending",
    },
    verificationValue: "xynes-verify=abc123",
  });
  mockVerifyWorkspaceDomain.mockResolvedValue({
    ...sampleDomain,
    status: "verified",
  });
  mockDeleteWorkspaceDomain.mockResolvedValue(undefined);
  mockCreateWorkspaceApiKey.mockResolvedValue({
    key: {
      ...sampleApiKey,
      id: "key-created",
      name: "New key",
      keyPrefix: "feedface",
    },
    rawKey: "xynes_live_newkeysecret",
  });
  mockRevokeWorkspaceApiKey.mockResolvedValue({
    ...sampleApiKey,
    status: "revoked",
  });
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

  it("registers a domain through the gateway client and reveals the one-time DNS value", async () => {
    const user = userEvent.setup();
    mockListWorkspaceDomains.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    const input = await screen.findByLabelText(/^domain$/i);
    await user.type(input, "  new.example.com  ");
    await user.click(screen.getByRole("button", { name: /add domain/i }));

    await waitFor(() => {
      expect(mockRegisterWorkspaceDomain).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-1",
          apiBaseUrl: "https://api.test.com",
          hostname: "new.example.com",
        }),
      );
    });
    expect(
      await screen.findByTestId("domain-verification-reveal"),
    ).toHaveTextContent("xynes-verify=abc123");
  });

  it("keeps the typed hostname when domain registration fails", async () => {
    const user = userEvent.setup();
    mockListWorkspaceDomains.mockResolvedValue([]);
    mockRegisterWorkspaceDomain.mockRejectedValueOnce(
      new WorkspaceIntegrationsApiError(403, "permission denied"),
    );

    render(<WorkspaceIntegrationsDashboard />);

    const input = await screen.findByLabelText(/^domain$/i);
    await user.type(input, "new.example.com");
    await user.click(screen.getByRole("button", { name: /add domain/i }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      /you don.?t have permission to manage workspace integrations/i,
    );
    expect(input).toHaveValue("new.example.com");
  });

  it("clears the one-time DNS verification reveal when the active workspace changes", async () => {
    // Cross-workspace leakage guard: a verification token that was just
    // revealed for workspace A must not remain visible after the user
    // switches to workspace B.
    const user = userEvent.setup();
    mockListWorkspaceDomains.mockResolvedValue([]);

    const { rerender } = render(<WorkspaceIntegrationsDashboard />);

    // Trigger the reveal for workspace A.
    const input = await screen.findByLabelText(/^domain$/i);
    await user.type(input, "first.example.com");
    await user.click(screen.getByRole("button", { name: /add domain/i }));

    expect(
      await screen.findByTestId("domain-verification-reveal"),
    ).toHaveTextContent("xynes-verify=abc123");

    // Switch to a different workspace and re-render.
    workspaceState.currentWorkspace = {
      id: "ws-2",
      name: "Second",
      slug: "second",
    };
    rerender(<WorkspaceIntegrationsDashboard />);

    await waitFor(() => {
      expect(
        screen.queryByTestId("domain-verification-reveal"),
      ).not.toBeInTheDocument();
    });
  });

  it("creates an API key through the gateway client and reveals the raw key once", async () => {
    const user = userEvent.setup();
    mockListWorkspaceApiKeys.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    const nameInput = await screen.findByLabelText(/^name$/i);
    await user.type(nameInput, "  My new key  ");
    await user.selectOptions(
      screen.getByLabelText(/^preset$/i),
      "cms_publisher",
    );
    await user.click(screen.getByRole("button", { name: /create api key/i }));

    await waitFor(() => {
      expect(mockCreateWorkspaceApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-1",
          apiBaseUrl: "https://api.test.com",
          name: "My new key",
          presetKey: "cms_publisher",
        }),
      );
    });

    // Raw key reveal surfaces ONCE inside the panel — and the raw value lives
    // ONLY in the reveal block so dismiss completely removes it from the DOM.
    const reveal = await screen.findByTestId("api-key-raw-reveal");
    expect(reveal).toHaveTextContent("xynes_live_newkeysecret");
  });

  it("revokes an API key through the gateway client", async () => {
    const user = userEvent.setup();
    mockListWorkspaceApiKeys.mockResolvedValue([sampleApiKey]);

    render(<WorkspaceIntegrationsDashboard />);

    const revokeButton = await screen.findByRole("button", {
      name: new RegExp(`revoke api key ${sampleApiKey.name}`, "i"),
    });
    await user.click(revokeButton);

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /^revoke$/i }));

    await waitFor(() => {
      expect(mockRevokeWorkspaceApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-1",
          apiBaseUrl: "https://api.test.com",
          keyId: sampleApiKey.id,
        }),
      );
    });
  });

  it("clears the one-time raw API key reveal when the active workspace changes", async () => {
    // Cross-workspace leakage guard mirror of the DNS test above.
    const user = userEvent.setup();
    mockListWorkspaceApiKeys.mockResolvedValue([]);

    const { rerender } = render(<WorkspaceIntegrationsDashboard />);

    const nameInput = await screen.findByLabelText(/^name$/i);
    await user.type(nameInput, "Initial key");
    await user.click(screen.getByRole("button", { name: /create api key/i }));

    expect(await screen.findByTestId("api-key-raw-reveal")).toHaveTextContent(
      "xynes_live_newkeysecret",
    );

    workspaceState.currentWorkspace = {
      id: "ws-2",
      name: "Second",
      slug: "second",
    };
    rerender(<WorkspaceIntegrationsDashboard />);

    await waitFor(() => {
      expect(
        screen.queryByTestId("api-key-raw-reveal"),
      ).not.toBeInTheDocument();
    });
    // The raw key string itself MUST be gone from the rendered DOM.
    expect(
      screen.queryByText(/xynes_live_newkeysecret/),
    ).not.toBeInTheDocument();
  });
});
