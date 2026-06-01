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

/**
 * Escape regex metacharacters in interpolated test fixtures so dynamic
 * `new RegExp(...)` matchers treat hostnames and key names literally.
 * Without this, the unescaped `.` in `pending.example.com` would also
 * match e.g. `pendingxexample.com`, causing false-positive matches and
 * tripping the CodeQL "incomplete regular expression for hostnames" rule
 * (PR #54 — alerts #9/#10/#11).
 */
const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const mockListWorkspaceDomains = vi.fn();
const mockListWorkspaceApiKeys = vi.fn();
const mockRegisterWorkspaceDomain = vi.fn();
const mockVerifyWorkspaceDomain = vi.fn();
const mockRegenerateWorkspaceDomainVerification = vi.fn();
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

// Hoisted searchParams stub used by the deep-link tests below (Task 5).
// We reset `searchParamsState.query` in `beforeEach` so other tests run with
// a clean URL by default.
const searchParamsState = vi.hoisted(() => ({
  query: "",
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(searchParamsState.query),
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
    regenerateWorkspaceDomainVerification: (...args: unknown[]) =>
      mockRegenerateWorkspaceDomainVerification(...args),
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
  CardTitle: React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
  >(function CardTitle({ children, ...rest }, ref) {
    return (
      <h2 ref={ref} {...rest}>
        {children}
      </h2>
    );
  }),
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
    ...rest
  }: {
    children?: React.ReactNode;
    variant?: string;
    title?: React.ReactNode;
  } & React.HTMLAttributes<HTMLDivElement>) => (
    <div role="alert" data-variant={variant} {...rest}>
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
  // BUG-AUTH-7: DomainManagementPanel now consumes `useToast` from
  // Lumia DS to fire a success toast on a verified auto-recheck.
  // The container-level tests don't assert on the toast itself
  // (that's covered in DomainManagementPanel.test.tsx); they just
  // need the hook to resolve without throwing.
  useToast: () => ({ show: vi.fn(), dismiss: vi.fn() }),
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
  searchParamsState.query = "";
  mockListWorkspaceDomains.mockReset();
  mockListWorkspaceApiKeys.mockReset();
  mockRegisterWorkspaceDomain.mockReset();
  mockVerifyWorkspaceDomain.mockReset();
  mockRegenerateWorkspaceDomainVerification.mockReset();
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
  mockRegenerateWorkspaceDomainVerification.mockResolvedValue({
    domain: {
      ...sampleDomain,
      status: "pending",
    },
    verificationValue: "xynes-verify=regen-default",
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

  describe("BUG-AUTH-6 — permission-aware empty state on 403 load", () => {
    // Pre-BUG-AUTH-6 behaviour: a 403 from the list refetch rendered the
    // same destructive "Couldn’t load integrations" alert as a 5xx
    // failure, wrongly framing a deliberate permission boundary as a
    // load error. After BUG-AUTH-6, 403 renders a neutral empty state.

    it("renders a neutral permission-aware empty state when the API keys load returns 403", async () => {
      mockListWorkspaceApiKeys.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(403, "permission denied"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      // The forbidden empty-state card carries an accessible region with
      // its own heading so SR users land on the explanation directly.
      const region = await screen.findByTestId(
        "workspace-integrations-forbidden-empty-state",
      );
      expect(region).toBeInTheDocument();

      // The neutral explanation (not "couldn't load", not "denied"):
      expect(
        screen.getByRole("heading", {
          name: /workspace integrations are managed by owners/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /workspace integrations — verified domains and workspace api keys — are managed by workspace owners\. contact your workspace owner to request changes\./i,
        ),
      ).toBeInTheDocument();

      // The "Back to dashboard" link is rendered as a real anchor and
      // targets the dashboard landing route.
      const backLink = screen.getByRole("link", {
        name: /back to dashboard/i,
      });
      expect(backLink).toHaveAttribute("href", "/dashboard/apps");
    });

    it("does NOT render a destructive error alert when the load returns 403", async () => {
      mockListWorkspaceApiKeys.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(403, "permission denied"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      // Wait for the forbidden region to appear so we know the load
      // settled before the assertions below.
      await screen.findByTestId("workspace-integrations-forbidden-empty-state");

      // No destructive alert role anywhere on the page.
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      // The destructive load-error title MUST NOT appear.
      expect(
        screen.queryByText(/couldn.?t load integrations/i),
      ).not.toBeInTheDocument();
      // The pre-BUG-AUTH-6 "you don’t have permission" alert copy MUST
      // NOT appear on the load path. (The same copy is still used by
      // the per-action error handler — that is a different surface.)
      expect(
        screen.queryByText(
          /you don.?t have permission to manage workspace integrations/i,
        ),
      ).not.toBeInTheDocument();
    });

    it("does NOT render the domains or API keys panels when the load returns 403", async () => {
      mockListWorkspaceApiKeys.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(403, "permission denied"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      await screen.findByTestId("workspace-integrations-forbidden-empty-state");

      // The owner-only management panels are completely absent from the
      // forbidden path. We don't render "0 domains" / "0 keys" copy and
      // we don't render the add-domain or create-key forms.
      expect(
        screen.queryByTestId("workspace-integrations-domains-count"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("workspace-integrations-api-keys-count"),
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/^domain$/i)).not.toBeInTheDocument();
    });

    it("still surfaces the active workspace slug on the forbidden empty state", async () => {
      mockListWorkspaceApiKeys.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(403, "permission denied"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      await screen.findByTestId("workspace-integrations-forbidden-empty-state");

      // Active-workspace context is preserved (no "wrong workspace?"
      // confusion for members).
      expect(
        screen.getByTestId("workspace-integrations-workspace-slug"),
      ).toHaveTextContent("xynes");
    });

    it("does NOT classify 401 as forbidden (session expiry stays on the destructive load-error path)", async () => {
      mockListWorkspaceApiKeys.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(401, "session expired"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      // 401 should still render the destructive alert with the
      // "session expired" body — NOT the forbidden empty state.
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/couldn.?t load integrations/i);
      expect(alert).toHaveTextContent(
        /your session has expired\. please sign in again\./i,
      );
      expect(
        screen.queryByTestId("workspace-integrations-forbidden-empty-state"),
      ).not.toBeInTheDocument();
    });

    it("renders the rate-limited copy for 429 responses (regression guard)", async () => {
      // Regression: an earlier draft of BUG-AUTH-6's `classifyLoadOutcome`
      // mapped status 404 (instead of 429) to the rate-limited message
      // key, leaving genuine 429 responses falling through to the
      // generic "Failed to load…" copy. This test pins the pre-existing
      // 429 → "Too many requests…" contract that the previous
      // `getIntegrationsLoadErrorMessage` honoured.
      mockListWorkspaceApiKeys.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(429, "rate limited"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/couldn.?t load integrations/i);
      expect(alert).toHaveTextContent(
        /too many requests\. please try again in a moment\./i,
      );
      expect(
        screen.queryByTestId("workspace-integrations-forbidden-empty-state"),
      ).not.toBeInTheDocument();
    });

    it("does NOT leak hostile upstream fields through the forbidden empty state", async () => {
      // Defense in depth: if the API returns a 403 whose error message
      // happens to contain a raw token, an internal audit handle, or a
      // hostile-looking string, none of it should survive into the
      // visible markup. The forbidden empty state renders pure catalog
      // copy.
      mockListWorkspaceApiKeys.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(
          403,
          "permission denied for token xynes_live_abc123 (apiKeyId=11111111-1111-1111-1111-111111111111)",
        ),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const region = await screen.findByTestId(
        "workspace-integrations-forbidden-empty-state",
      );

      const html = region.outerHTML;
      expect(html).not.toMatch(/xynes_live_/);
      expect(html).not.toMatch(/apiKeyId=/);
      expect(html).not.toMatch(/11111111-1111-1111-1111-111111111111/);
    });
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

  it("regenerates the verification token through the gateway client and reveals the new value", async () => {
    // Phase D: the user clicks "Get new value" on a pending/failed row
    // when they've lost the original one-time reveal. The container
    // calls `regenerateWorkspaceDomainVerification`, drops the new raw
    // value into the same one-time reveal slot, and refreshes the row.
    const user = userEvent.setup();
    const pendingExisting = {
      ...sampleDomain,
      id: "dom-pending-existing",
      hostname: "existing.example.com",
      status: "pending" as const,
      verificationName: "_xynes.existing.example.com",
    };
    mockListWorkspaceDomains.mockResolvedValue([pendingExisting]);
    mockRegenerateWorkspaceDomainVerification.mockResolvedValue({
      domain: { ...pendingExisting },
      verificationValue: "xynes-verify=regen-fresh",
    });

    render(<WorkspaceIntegrationsDashboard />);

    const regenerateButton = await screen.findByRole("button", {
      name: /get a new verification value for existing\.example\.com/i,
    });
    await user.click(regenerateButton);

    await waitFor(() => {
      expect(mockRegenerateWorkspaceDomainVerification).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: "ws-1",
          apiBaseUrl: "https://api.test.com",
          domainId: pendingExisting.id,
        }),
      );
    });

    const reveal = await screen.findByTestId("domain-verification-reveal");
    expect(reveal).toHaveTextContent("xynes-verify=regen-fresh");
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
      name: new RegExp(`revoke api key ${escapeRegex(sampleApiKey.name)}`, "i"),
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

  // ── Task 5: Deep-link query support ────────────────────────────────────
  //
  // CMS console builds links like
  //   /dashboard/integrations?tab=api-keys&preset=cms_publisher
  // (see `xynes-front-end/xynes-cms-console-web/src/features/integrations/workspace-admin-links.ts`).
  // The auth dashboard must:
  //   1. Pre-select the requested preset in the create-API-key form.
  //   2. Move keyboard focus to the API keys section when `tab=api-keys`,
  //      so screen-reader and keyboard users land on the relevant heading
  //      without scrolling.
  //   3. Move keyboard focus to the Verified domains heading when
  //      `tab=domains`.
  //   4. Reject unknown / hostile values for both params (no crash, no
  //      preset preselect, no random focus jump).

  it("preselects the cms_readonly preset when ?preset=cms_readonly is present", async () => {
    searchParamsState.query = "preset=cms_readonly";
    mockListWorkspaceApiKeys.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    const presetSelect = await screen.findByLabelText(/^preset$/i);
    await waitFor(() => {
      expect(presetSelect).toHaveValue("cms_readonly");
    });
  });

  it("preselects the cms_publisher preset when ?preset=cms_publisher is present", async () => {
    searchParamsState.query = "preset=cms_publisher";
    mockListWorkspaceApiKeys.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    const presetSelect = await screen.findByLabelText(/^preset$/i);
    await waitFor(() => {
      expect(presetSelect).toHaveValue("cms_publisher");
    });
  });

  it("ignores an unknown preset value and does not change the default", async () => {
    searchParamsState.query = "preset=__not_a_preset__";
    mockListWorkspaceApiKeys.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    const presetSelect = await screen.findByLabelText(/^preset$/i);
    // Default in the panel is `cms_readonly` and unknown presets must NOT
    // change it (no crash, no `__not_a_preset__` selection).
    await waitFor(() => {
      expect(presetSelect).toHaveValue("cms_readonly");
    });
  });

  it("moves focus to the API keys heading when ?tab=api-keys is present", async () => {
    searchParamsState.query = "tab=api-keys";
    mockListWorkspaceApiKeys.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    const apiKeysHeading = await screen.findByRole("heading", {
      name: /workspace api keys/i,
    });
    await waitFor(() => {
      expect(apiKeysHeading).toHaveFocus();
    });
  });

  it("moves focus to the Verified domains heading when ?tab=domains is present", async () => {
    searchParamsState.query = "tab=domains";
    mockListWorkspaceDomains.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    const domainsHeading = await screen.findByRole("heading", {
      name: /verified domains/i,
    });
    await waitFor(() => {
      expect(domainsHeading).toHaveFocus();
    });
  });

  it("ignores an unknown tab value and does not move focus", async () => {
    searchParamsState.query = "tab=__not_a_tab__";
    mockListWorkspaceApiKeys.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    // Wait for content to render so any synchronous focus side-effect
    // would have fired by now.
    await screen.findByRole("heading", { name: /verified domains/i });

    expect(
      screen.getByRole("heading", { name: /verified domains/i }),
    ).not.toHaveFocus();
    expect(
      screen.getByRole("heading", { name: /workspace api keys/i }),
    ).not.toHaveFocus();
  });

  it("supports combined ?tab=api-keys&preset=cms_publisher", async () => {
    searchParamsState.query = "tab=api-keys&preset=cms_publisher";
    mockListWorkspaceApiKeys.mockResolvedValue([]);

    render(<WorkspaceIntegrationsDashboard />);

    const apiKeysHeading = await screen.findByRole("heading", {
      name: /workspace api keys/i,
    });
    await waitFor(() => {
      expect(apiKeysHeading).toHaveFocus();
    });

    const presetSelect = screen.getByLabelText(/^preset$/i);
    expect(presetSelect).toHaveValue("cms_publisher");
  });

  // ── WSA-FIX-1: action-error vs reload-error split ──────────────────────
  //
  // Per the WSA-FIX-1 plan, action handlers (register/verify/regenerate/
  // delete domain, create/revoke API key) must NOT write to the
  // "Couldn't load integrations" load-error alert on failure. Each action
  // surfaces failures through its own action-error alert with action-
  // specific copy ("Couldn't remove domain", "Couldn't verify domain", …).
  //
  // When an action SUCCEEDS but the follow-up list refetch fails, we
  // must show a soft "Couldn't refresh the list" banner instead of the
  // destructive load-error alert — the action did succeed, the page is
  // not broken, the list is just stale until the user retries.
  describe("WSA-FIX-1: action-error vs reload-error split", () => {
    // The original user report was specifically about clicking "Cancel
    // domain" on a pending row, so this describe block exercises the
    // pending-domain destructive flow. (The other handlers
    // — register/verify/regenerate/create-key/revoke-key — are tested
    // below with their own row labels.)
    const pendingDomain = {
      ...sampleDomain,
      id: "dom-pending-cancel",
      hostname: "pending.example.com",
      status: "pending" as const,
      verificationName: "_xynes.pending.example.com",
      verifiedAt: null,
    };

    it("does not surface any alert when a Cancel-domain action succeeds and the reload succeeds", async () => {
      const user = userEvent.setup();
      mockListWorkspaceDomains.mockResolvedValue([pendingDomain]);

      render(<WorkspaceIntegrationsDashboard />);

      await waitFor(() => {
        expect(mockListWorkspaceDomains).toHaveBeenCalled();
      });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      const cancelButton = await screen.findByRole("button", {
        name: new RegExp(
          `cancel domain verification for ${escapeRegex(pendingDomain.hostname)}`,
          "i",
        ),
      });
      await user.click(cancelButton);

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", {
          name: /^cancel verification$/i,
        }),
      );

      await waitFor(() => {
        expect(mockDeleteWorkspaceDomain).toHaveBeenCalledWith(
          expect.objectContaining({
            workspaceId: "ws-1",
            domainId: pendingDomain.id,
          }),
        );
      });

      // No alert of any kind — neither the destructive load alert nor the
      // soft reload-failed banner nor the action-error alert.
      await waitFor(() => {
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      });
    });

    it("surfaces the soft reload-failed banner (not the destructive load alert) when Cancel-domain succeeds but the follow-up refetch fails", async () => {
      const user = userEvent.setup();
      // First load succeeds; the post-delete refetch fails on the
      // domains call — `Promise.all` rejects, refresh-after-action
      // surfaces the soft banner instead of `loadError`.
      mockListWorkspaceDomains.mockResolvedValueOnce([pendingDomain]);
      mockListWorkspaceDomains.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(500, "transient"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const cancelButton = await screen.findByRole("button", {
        name: new RegExp(
          `cancel domain verification for ${escapeRegex(pendingDomain.hostname)}`,
          "i",
        ),
      });
      await user.click(cancelButton);

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", {
          name: /^cancel verification$/i,
        }),
      );

      // The soft banner must appear.
      const softBanner = await screen.findByTestId(
        "workspace-integrations-reload-failed",
      );
      expect(softBanner).toBeInTheDocument();
      expect(softBanner).toHaveTextContent(
        /Action succeeded, but we couldn’t refresh the list/i,
      );

      // The destructive "Couldn’t load integrations" alert MUST NOT fire.
      expect(
        screen.queryByText(/Couldn’t load integrations/i),
      ).not.toBeInTheDocument();
    });

    it("surfaces 'Couldn’t remove domain' (not 'Couldn’t load integrations') when Cancel-domain fails", async () => {
      const user = userEvent.setup();
      mockListWorkspaceDomains.mockResolvedValue([pendingDomain]);
      mockDeleteWorkspaceDomain.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(403, "denied"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const cancelButton = await screen.findByRole("button", {
        name: new RegExp(
          `cancel domain verification for ${escapeRegex(pendingDomain.hostname)}`,
          "i",
        ),
      });
      await user.click(cancelButton);

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", {
          name: /^cancel verification$/i,
        }),
      );

      await waitFor(() => {
        expect(screen.getByText(/Couldn’t remove domain/i)).toBeInTheDocument();
      });
      // Body carries the 403 copy.
      expect(
        screen.getByText(
          /you don.?t have permission to manage workspace integrations/i,
        ),
      ).toBeInTheDocument();
      // The destructive load alert title must NOT appear.
      expect(
        screen.queryByText(/Couldn’t load integrations/i),
      ).not.toBeInTheDocument();
    });

    it("surfaces 'Couldn’t verify domain' when verify fails", async () => {
      const user = userEvent.setup();
      const pending = {
        ...sampleDomain,
        id: "dom-pending-verify",
        hostname: "pending.example.com",
        status: "pending" as const,
        verificationName: "_xynes.pending.example.com",
        verifiedAt: null,
      };
      mockListWorkspaceDomains.mockResolvedValue([pending]);
      mockVerifyWorkspaceDomain.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(500, "boom"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const recheckButton = await screen.findByRole("button", {
        name: new RegExp(
          `recheck verification for ${escapeRegex(pending.hostname)}`,
          "i",
        ),
      });
      await user.click(recheckButton);

      await waitFor(() => {
        expect(screen.getByText(/Couldn’t verify domain/i)).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/Couldn’t load integrations/i),
      ).not.toBeInTheDocument();
    });

    it("surfaces 'Couldn’t regenerate verification value' when regenerate fails", async () => {
      const user = userEvent.setup();
      const pending = {
        ...sampleDomain,
        id: "dom-pending-regen",
        hostname: "regen.example.com",
        status: "pending" as const,
        verificationName: "_xynes.regen.example.com",
        verifiedAt: null,
      };
      mockListWorkspaceDomains.mockResolvedValue([pending]);
      mockRegenerateWorkspaceDomainVerification.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(500, "boom"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const regenButton = await screen.findByRole("button", {
        name: new RegExp(
          `get a new verification value for ${escapeRegex(pending.hostname)}`,
          "i",
        ),
      });
      await user.click(regenButton);

      await waitFor(() => {
        expect(
          screen.getByText(/Couldn’t regenerate verification value/i),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/Couldn’t load integrations/i),
      ).not.toBeInTheDocument();
    });

    it("surfaces 'Couldn’t add domain' when register fails", async () => {
      const user = userEvent.setup();
      mockListWorkspaceDomains.mockResolvedValue([]);
      mockRegisterWorkspaceDomain.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(422, "invalid"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const input = await screen.findByLabelText(/^domain$/i);
      await user.type(input, "broken.example.com");
      await user.click(screen.getByRole("button", { name: /add domain/i }));

      await waitFor(() => {
        expect(screen.getByText(/Couldn’t add domain/i)).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/Couldn’t load integrations/i),
      ).not.toBeInTheDocument();
    });

    it("surfaces 'Couldn’t create API key' when create-key fails", async () => {
      const user = userEvent.setup();
      mockListWorkspaceApiKeys.mockResolvedValue([]);
      mockCreateWorkspaceApiKey.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(403, "denied"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const nameInput = await screen.findByLabelText(/^name$/i);
      await user.type(nameInput, "My key");
      await user.click(screen.getByRole("button", { name: /create api key/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/Couldn’t create API key/i),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/Couldn’t load integrations/i),
      ).not.toBeInTheDocument();
    });

    it("surfaces 'Couldn’t revoke API key' when revoke fails", async () => {
      const user = userEvent.setup();
      mockListWorkspaceApiKeys.mockResolvedValue([sampleApiKey]);
      mockRevokeWorkspaceApiKey.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(500, "boom"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const revokeButton = await screen.findByRole("button", {
        name: new RegExp(
          `revoke api key ${escapeRegex(sampleApiKey.name)}`,
          "i",
        ),
      });
      await user.click(revokeButton);

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", { name: /^revoke$/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Couldn’t revoke API key/i),
        ).toBeInTheDocument();
      });
      expect(
        screen.queryByText(/Couldn’t load integrations/i),
      ).not.toBeInTheDocument();
    });

    it("clears the action-error alert on the Dismiss button", async () => {
      const user = userEvent.setup();
      mockListWorkspaceDomains.mockResolvedValue([]);
      mockRegisterWorkspaceDomain.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(422, "invalid"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const input = await screen.findByLabelText(/^domain$/i);
      await user.type(input, "broken.example.com");
      await user.click(screen.getByRole("button", { name: /add domain/i }));

      await screen.findByText(/Couldn’t add domain/i);

      await user.click(
        screen.getByRole("button", { name: /dismiss action error/i }),
      );
      await waitFor(() => {
        expect(
          screen.queryByText(/Couldn’t add domain/i),
        ).not.toBeInTheDocument();
      });
    });

    it("clears the action-error alert when the next action succeeds", async () => {
      const user = userEvent.setup();
      mockListWorkspaceDomains.mockResolvedValue([]);
      // First register: 422 → action error.
      mockRegisterWorkspaceDomain.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(422, "invalid"),
      );
      // Second register: success → action error must clear.
      mockRegisterWorkspaceDomain.mockResolvedValueOnce({
        domain: {
          ...sampleDomain,
          id: "dom-second",
          hostname: "second.example.com",
          status: "pending",
        },
        verificationValue: "xynes-verify=second",
      });

      render(<WorkspaceIntegrationsDashboard />);

      const input = await screen.findByLabelText(/^domain$/i);
      await user.type(input, "first.example.com");
      await user.click(screen.getByRole("button", { name: /add domain/i }));
      await screen.findByText(/Couldn’t add domain/i);

      // Clear and submit again — second call succeeds.
      await user.clear(input);
      await user.type(input, "second.example.com");
      await user.click(screen.getByRole("button", { name: /add domain/i }));

      await waitFor(() => {
        expect(
          screen.queryByText(/Couldn’t add domain/i),
        ).not.toBeInTheDocument();
      });
    });

    it("clears a stale loadError banner after a successful post-action refresh", async () => {
      // Regression for the CodeRabbit Minor review on PR #54:
      // If `loadError` was previously set (e.g. the initial load failed
      // and the user retried unsuccessfully), a later successful action
      // + post-action refresh must clear the destructive
      // "Couldn’t load integrations" banner — otherwise the UI shows
      // both fresh data AND a stale destructive alert.
      const user = userEvent.setup();
      mockListWorkspaceDomains.mockReset();
      mockListWorkspaceApiKeys.mockReset();
      // 1st load (mount) FAILS → loadError surfaces.
      mockListWorkspaceDomains.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(500, "transient"),
      );
      // 2nd + 3rd load calls (post-action refresh: domains AND keys) succeed.
      mockListWorkspaceDomains.mockResolvedValue([]);
      mockListWorkspaceApiKeys.mockResolvedValue([]);

      render(<WorkspaceIntegrationsDashboard />);

      // Wait for the destructive load alert to render.
      await screen.findByText(/Couldn’t load integrations/i);

      // Now perform a successful register — the post-action refresh
      // should clear the stale load alert.
      const input = await screen.findByLabelText(/^domain$/i);
      await user.type(input, "fresh.example.com");
      await user.click(screen.getByRole("button", { name: /add domain/i }));

      await waitFor(() => {
        expect(
          screen.queryByText(/Couldn’t load integrations/i),
        ).not.toBeInTheDocument();
      });
      // And the soft reload-failed banner must NOT be visible either —
      // the refresh succeeded.
      expect(
        screen.queryByTestId("workspace-integrations-reload-failed"),
      ).not.toBeInTheDocument();
    });

    it("surfaces a status-code-aware message for an unmapped 4xx (e.g. 411 from gateway body-limit)", async () => {
      // Regression for the WSA-FIX-1 follow-up: when the gateway returns
      // 411 (because a bodyless DELETE was sent without Content-Length),
      // the dashboard previously fell back to the generic per-kind copy
      // "We couldn't remove this domain. Please try again." That copy
      // hides the real failure from the operator. The helper now maps
      // any unmapped 4xx to a status-code-aware message.
      const user = userEvent.setup();
      const pending = {
        ...sampleDomain,
        id: "dom-pending-411",
        hostname: "pending.example.com",
        status: "pending" as const,
        verificationName: "_xynes.pending.example.com",
        verifiedAt: null,
      };
      mockListWorkspaceDomains.mockResolvedValue([pending]);
      mockDeleteWorkspaceDomain.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(411, "Length Required"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const cancelButton = await screen.findByRole("button", {
        name: new RegExp(
          `cancel domain verification for ${escapeRegex(pending.hostname)}`,
          "i",
        ),
      });
      await user.click(cancelButton);

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", {
          name: /^cancel verification$/i,
        }),
      );

      // Title is still per-action so the user knows what failed.
      await screen.findByText(/Couldn’t remove domain/i);
      // But the body MUST NOT be the generic "Please try again." copy
      // — it must include the status code.
      expect(screen.getByText(/status 411/i)).toBeInTheDocument();
      expect(
        screen.queryByText(
          /We couldn.t remove this domain\. Please try again\./i,
        ),
      ).not.toBeInTheDocument();
    });

    it("surfaces a server-problem message for an unmapped 5xx", async () => {
      const user = userEvent.setup();
      const pending = {
        ...sampleDomain,
        id: "dom-pending-503",
        hostname: "pending.example.com",
        status: "pending" as const,
        verificationName: "_xynes.pending.example.com",
        verifiedAt: null,
      };
      mockListWorkspaceDomains.mockResolvedValue([pending]);
      mockDeleteWorkspaceDomain.mockRejectedValueOnce(
        new WorkspaceIntegrationsApiError(503, "Service Unavailable"),
      );

      render(<WorkspaceIntegrationsDashboard />);

      const cancelButton = await screen.findByRole("button", {
        name: new RegExp(
          `cancel domain verification for ${escapeRegex(pending.hostname)}`,
          "i",
        ),
      });
      await user.click(cancelButton);

      const dialog = await screen.findByRole("dialog");
      await user.click(
        within(dialog).getByRole("button", {
          name: /^cancel verification$/i,
        }),
      );

      await screen.findByText(/Couldn’t remove domain/i);
      expect(screen.getByText(/server hit a problem/i)).toBeInTheDocument();
    });
  });
});
