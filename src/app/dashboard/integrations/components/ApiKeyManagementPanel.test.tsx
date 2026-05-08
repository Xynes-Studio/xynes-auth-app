import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiKeyManagementPanel } from "./ApiKeyManagementPanel";
import type { WorkspaceApiKey } from "@/lib/integrations/workspace-integrations-types";

// Lumia DS mocks
//
// Mirrors the mock recipe from `DomainManagementPanel.test.tsx` (Task 3).
// Each mock spreads attributes through to the DOM so accessibility queries
// (role/aria-*) resolve.

vi.mock("@lumia-ui/components", () => {
  const Button = ({
    children,
    onClick,
    type,
    disabled,
    "aria-label": ariaLabel,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );

  const Input = React.forwardRef<
    HTMLInputElement,
    React.InputHTMLAttributes<HTMLInputElement>
  >(function Input(props, ref) {
    return <input ref={ref} {...props} />;
  });

  const Select = React.forwardRef<
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
  });

  return {
    Alert: ({
      children,
      title,
      variant,
    }: {
      children?: React.ReactNode;
      title?: React.ReactNode;
      variant?: string;
    }) => (
      <div role="alert" data-variant={variant}>
        {title ? <strong>{title}</strong> : null}
        {children}
      </div>
    ),
    Badge: ({
      children,
      variant,
    }: {
      children?: React.ReactNode;
      variant?: string;
    }) => <span data-variant={variant}>{children}</span>,
    Button,
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
          {description ? <p>{description}</p> : null}
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
    Flex: ({
      children,
      className,
    }: {
      children?: React.ReactNode;
      className?: string;
    }) => <div className={className}>{children}</div>,
    Input,
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
    Select,
    StatusPill: ({
      children,
      variant,
    }: {
      children?: React.ReactNode;
      variant?: string;
    }) => <span data-variant={variant}>{children}</span>,
    Spinner: () => <div role="status">Loading…</div>,
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
  };
});

// Sample fixtures

const activeKey: WorkspaceApiKey = {
  id: "key-active",
  name: "CMS reader",
  keyPrefix: "abcd1234",
  status: "active",
  presetKey: "cms_readonly",
  createdAt: "2026-04-01T00:00:00.000Z",
  lastUsedAt: "2026-04-15T00:00:00.000Z",
  expiresAt: "2027-01-01T00:00:00.000Z",
};

const revokedKey: WorkspaceApiKey = {
  id: "key-revoked",
  name: "Old publisher",
  keyPrefix: "deadbeef",
  status: "revoked",
  presetKey: "cms_publisher",
  createdAt: "2026-01-01T00:00:00.000Z",
  revokedAt: "2026-04-01T00:00:00.000Z",
};

const expiredKey: WorkspaceApiKey = {
  id: "key-expired",
  name: "Telemetry probe",
  keyPrefix: "feed1234",
  status: "expired",
  presetKey: "telemetry_read",
  createdAt: "2025-01-01T00:00:00.000Z",
  expiresAt: "2026-01-01T00:00:00.000Z",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function defaultProps(
  overrides: Partial<React.ComponentProps<typeof ApiKeyManagementPanel>> = {},
) {
  return {
    apiKeys: [] as WorkspaceApiKey[],
    isLoading: false,
    onCreateApiKey: vi.fn().mockResolvedValue(undefined),
    onRevokeApiKey: vi.fn().mockResolvedValue(undefined),
    pendingRawKey: null as null | { keyId: string; rawKey: string },
    onDismissRawKey: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ApiKeyManagementPanel", () => {
  it("invites the workspace owner to create an API key when the list is empty", () => {
    render(<ApiKeyManagementPanel {...defaultProps()} />);

    expect(screen.getByText(/no api keys yet/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^preset$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create api key/i }),
    ).toBeInTheDocument();
  });

  it("lists name, prefix, status, preset, last used, and expiry for an active key", () => {
    render(
      <ApiKeyManagementPanel {...defaultProps({ apiKeys: [activeKey] })} />,
    );

    const row = screen.getByTestId(`api-key-row-${activeKey.id}`);
    expect(within(row).getByText(activeKey.name)).toBeInTheDocument();
    expect(within(row).getByText(/abcd1234/)).toBeInTheDocument();
    // Status pill text is matched exactly so it doesn't collide with anything
    // else in the row (similar to Task 3).
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(within(row).getByText(/cms read-only/i)).toBeInTheDocument();
    // Last used + expiry surface as readable text (formatted).
    expect(within(row).getByText(/last used/i)).toBeInTheDocument();
    expect(within(row).getByText(/expires/i)).toBeInTheDocument();
  });

  it("renders revoked and expired keys with visually distinct status pills", () => {
    render(
      <ApiKeyManagementPanel
        {...defaultProps({ apiKeys: [activeKey, revokedKey, expiredKey] })}
      />,
    );

    const activeRow = screen.getByTestId(`api-key-row-${activeKey.id}`);
    const revokedRow = screen.getByTestId(`api-key-row-${revokedKey.id}`);
    const expiredRow = screen.getByTestId(`api-key-row-${expiredKey.id}`);

    expect(within(activeRow).getByText("Active")).toBeInTheDocument();
    expect(within(revokedRow).getByText("Revoked")).toBeInTheDocument();
    expect(within(expiredRow).getByText("Expired")).toBeInTheDocument();
  });

  it("does not render any field whose name ends in Hash", () => {
    // Defense in depth: even if upstream leaks a hash, the panel must not
    // render it.
    const hostileKey = {
      ...activeKey,
      keyHash: "DO_NOT_RENDER_HASH",
      rawKey: "DO_NOT_RENDER_RAWKEY",
    } as unknown as WorkspaceApiKey;
    render(
      <ApiKeyManagementPanel {...defaultProps({ apiKeys: [hostileKey] })} />,
    );
    expect(screen.queryByText(/DO_NOT_RENDER_HASH/)).not.toBeInTheDocument();
    expect(screen.queryByText(/DO_NOT_RENDER_RAWKEY/)).not.toBeInTheDocument();
  });

  it("validates that the create form requires a non-empty name", async () => {
    const onCreate = vi.fn();
    render(
      <ApiKeyManagementPanel
        {...defaultProps({ onCreateApiKey: onCreate })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /create api key/i }),
    );
    expect(onCreate).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/enter a name for the api key/i),
    ).toBeInTheDocument();
  });

  it("submits the create form with the trimmed name and chosen preset", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <ApiKeyManagementPanel
        {...defaultProps({ onCreateApiKey: onCreate })}
      />,
    );

    await userEvent.type(screen.getByLabelText(/^name$/i), "  My CMS key  ");
    await userEvent.selectOptions(
      screen.getByLabelText(/^preset$/i),
      "cms_publisher",
    );
    await userEvent.click(
      screen.getByRole("button", { name: /create api key/i }),
    );

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledTimes(1);
    });
    expect(onCreate).toHaveBeenCalledWith({
      name: "My CMS key",
      presetKey: "cms_publisher",
    });
  });

  it("renders the one-time raw key reveal exactly once after creation", () => {
    render(
      <ApiKeyManagementPanel
        {...defaultProps({
          apiKeys: [activeKey],
          pendingRawKey: {
            keyId: activeKey.id,
            rawKey: "xynes_live_abc123def456",
          },
        })}
      />,
    );

    const reveal = screen.getByTestId("api-key-raw-reveal");
    expect(reveal).toHaveTextContent("xynes_live_abc123def456");
    expect(reveal).toHaveAttribute("role", "status");
    expect(reveal).toHaveAttribute("aria-live", "polite");
    // The reveal must explicitly tell the user this is the only time the key
    // will be visible.
    expect(
      within(reveal).getByText(/won.?t see this key again/i),
    ).toBeInTheDocument();
  });

  it("removes the raw key from the DOM after dismiss", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(
      <ApiKeyManagementPanel
        {...defaultProps({
          apiKeys: [activeKey],
          pendingRawKey: {
            keyId: activeKey.id,
            rawKey: "xynes_live_abc123def456",
          },
          onDismissRawKey: onDismiss,
        })}
      />,
    );

    expect(screen.getByTestId("api-key-raw-reveal")).toHaveTextContent(
      "xynes_live_abc123def456",
    );

    await userEvent.click(
      screen.getByRole("button", { name: /dismiss api key/i }),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // The container will null out `pendingRawKey` in response. Simulate that.
    rerender(
      <ApiKeyManagementPanel
        {...defaultProps({
          apiKeys: [activeKey],
          pendingRawKey: null,
          onDismissRawKey: onDismiss,
        })}
      />,
    );

    await waitFor(() => {
      expect(
        screen.queryByTestId("api-key-raw-reveal"),
      ).not.toBeInTheDocument();
    });
    // The raw key string itself MUST be gone from the rendered DOM —
    // i.e. the panel must not have copied it into any other node.
    expect(
      screen.queryByText(/xynes_live_abc123def456/),
    ).not.toBeInTheDocument();
  });

  it("requires confirmation before revoking an active key", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    render(
      <ApiKeyManagementPanel
        {...defaultProps({
          apiKeys: [activeKey],
          onRevokeApiKey: onRevoke,
        })}
      />,
    );

    // First click opens the confirm dialog — handler must NOT fire yet.
    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`revoke.*${escapeRegExp(activeKey.name)}`, "i"),
      }),
    );
    expect(onRevoke).not.toHaveBeenCalled();

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(new RegExp(escapeRegExp(activeKey.name), "i")),
    ).toBeInTheDocument();

    // Cancel does NOT revoke.
    await userEvent.click(
      within(dialog).getByRole("button", { name: /cancel/i }),
    );
    expect(onRevoke).not.toHaveBeenCalled();

    // Reopen + confirm DOES revoke.
    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(`revoke.*${escapeRegExp(activeKey.name)}`, "i"),
      }),
    );
    const dialog2 = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog2).getByRole("button", { name: /^revoke$/i }),
    );

    await waitFor(() => {
      expect(onRevoke).toHaveBeenCalledTimes(1);
    });
    expect(onRevoke).toHaveBeenCalledWith(activeKey.id);
  });

  it("does not render a revoke button for already-revoked or expired keys", () => {
    render(
      <ApiKeyManagementPanel
        {...defaultProps({ apiKeys: [revokedKey, expiredKey] })}
      />,
    );

    expect(
      screen.queryByRole("button", {
        name: new RegExp(`revoke.*${escapeRegExp(revokedKey.name)}`, "i"),
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: new RegExp(`revoke.*${escapeRegExp(expiredKey.name)}`, "i"),
      }),
    ).not.toBeInTheDocument();
  });

  it("disables row actions and the create button while loading", () => {
    render(
      <ApiKeyManagementPanel
        {...defaultProps({
          apiKeys: [activeKey],
          isLoading: true,
        })}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: new RegExp(`revoke.*${escapeRegExp(activeKey.name)}`, "i"),
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /create api key/i }),
    ).toBeDisabled();
  });

  it("renders preset labels for all five MVP presets", () => {
    const presets: Array<{
      apiKeys: WorkspaceApiKey[];
      label: RegExp;
    }> = [
      {
        apiKeys: [
          { ...activeKey, id: "k-ro", presetKey: "cms_readonly" },
        ],
        label: /cms read-only/i,
      },
      {
        apiKeys: [
          { ...activeKey, id: "k-aut", presetKey: "cms_authoring" },
        ],
        label: /cms authoring/i,
      },
      {
        apiKeys: [
          { ...activeKey, id: "k-pub", presetKey: "cms_publisher" },
        ],
        label: /cms publisher/i,
      },
      {
        apiKeys: [
          { ...activeKey, id: "k-tel", presetKey: "telemetry_read" },
        ],
        label: /telemetry read/i,
      },
      {
        apiKeys: [
          { ...activeKey, id: "k-adm", presetKey: "workspace_admin" },
        ],
        label: /workspace admin/i,
      },
    ];

    for (const { apiKeys, label } of presets) {
      const { unmount } = render(
        <ApiKeyManagementPanel {...defaultProps({ apiKeys })} />,
      );
      // Scope to the row so the create-form's preset <option> labels (which
      // contain the same strings) don't collide with the per-key preset
      // label rendered in the row.
      const row = screen.getByTestId(`api-key-row-${apiKeys[0].id}`);
      expect(within(row).getByText(label)).toBeInTheDocument();
      unmount();
    }
  });
});
