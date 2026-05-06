import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DomainManagementPanel } from "./DomainManagementPanel";
import type { WorkspaceDomain } from "@/lib/integrations/workspace-integrations-types";

// Lumia DS mocks
//
// Mirror the mock recipe from `WorkspaceIntegrationsDashboard.test.tsx`
// (Task 2). Each mock spreads attributes through to the DOM so
// accessibility queries (role/aria-*) resolve.

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

const verifiedDomain: WorkspaceDomain = {
  id: "dom-verified",
  hostname: "verified.example.com",
  status: "verified",
  verificationMethod: "dns_txt",
  verificationName: "_xynes.verified.example.com",
  verifiedAt: "2026-04-01T00:00:00.000Z",
};

const pendingDomain: WorkspaceDomain = {
  id: "dom-pending",
  hostname: "pending.example.com",
  status: "pending",
  verificationMethod: "dns_txt",
  verificationName: "_xynes.pending.example.com",
};

const failedDomain: WorkspaceDomain = {
  id: "dom-failed",
  hostname: "failed.example.com",
  status: "failed",
  verificationMethod: "dns_txt",
  verificationName: "_xynes.failed.example.com",
  failureMessage: "DNS TXT record not found",
};

// Escape regex metacharacters before interpolating dynamic strings (such as
// hostnames containing ".") into a `new RegExp(...)`. Without this, the dot in
// "example.com" would match any character, broadening the test assertion and
// triggering CodeQL's "Incomplete regular expression for hostnames" rule.
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Default panel handlers — overridable per-test via spread in `render`.
function defaultProps(
  overrides: Partial<React.ComponentProps<typeof DomainManagementPanel>> = {},
) {
  return {
    domains: [] as WorkspaceDomain[],
    isLoading: false,
    onRegisterDomain: vi.fn().mockResolvedValue(undefined),
    onVerifyDomain: vi.fn().mockResolvedValue(undefined),
    onDeleteDomain: vi.fn().mockResolvedValue(undefined),
    pendingVerificationValue: null as null | {
      domainId: string;
      verificationValue: string;
    },
    onDismissVerificationValue: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DomainManagementPanel", () => {
  it("invites the workspace owner to add a domain when the list is empty", () => {
    render(<DomainManagementPanel {...defaultProps()} />);

    expect(screen.getByText(/no verified domains yet/i)).toBeInTheDocument();
    // The add-domain form is always available so an owner can add one.
    expect(screen.getByLabelText(/^domain$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add domain/i }),
    ).toBeInTheDocument();
  });

  it("renders a verified domain row with its verified status", () => {
    render(
      <DomainManagementPanel
        {...defaultProps({ domains: [verifiedDomain] })}
      />,
    );

    const row = screen.getByTestId(`domain-row-${verifiedDomain.id}`);
    expect(within(row).getByText(verifiedDomain.hostname)).toBeInTheDocument();
    // Match the status pill text exactly so we don't collide with the
    // hostname which contains "verified".
    expect(within(row).getByText("Verified")).toBeInTheDocument();
  });

  it("renders a pending domain row with the DNS TXT name and value", () => {
    render(
      <DomainManagementPanel {...defaultProps({ domains: [pendingDomain] })} />,
    );

    const row = screen.getByTestId(`domain-row-${pendingDomain.id}`);
    expect(within(row).getByText(pendingDomain.hostname)).toBeInTheDocument();
    expect(within(row).getByText("Pending")).toBeInTheDocument();
    expect(
      within(row).getByText(pendingDomain.verificationName),
    ).toBeInTheDocument();
  });

  it("renders the one-time DNS TXT verification value when present", async () => {
    const onDismiss = vi.fn();
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain],
          pendingVerificationValue: {
            domainId: pendingDomain.id,
            verificationValue: "xynes-verify=abc123",
          },
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    const reveal = screen.getByTestId("domain-verification-reveal");
    expect(reveal).toHaveTextContent("xynes-verify=abc123");
    // Reveal must be an explicit live region so SR users hear the new
    // instructions even if the surrounding `InlineAlert` internals change.
    expect(reveal).toHaveAttribute("role", "status");
    expect(reveal).toHaveAttribute("aria-live", "polite");

    const dismiss = screen.getByRole("button", {
      name: /dismiss verification value/i,
    });
    await userEvent.click(dismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders a failed domain row with a safe failure message", () => {
    render(
      <DomainManagementPanel {...defaultProps({ domains: [failedDomain] })} />,
    );

    const row = screen.getByTestId(`domain-row-${failedDomain.id}`);
    expect(within(row).getByText("Failed")).toBeInTheDocument();
    expect(
      within(row).getByText(/dns txt record not found/i),
    ).toBeInTheDocument();
  });

  it("does not render any field whose name ends in Hash", () => {
    // Defense in depth: even if upstream leaks a hash, the panel must not
    // render it. We craft a domain object with a hostile field and assert
    // the panel never echoes it.
    const hostileDomain = {
      ...pendingDomain,
      verificationValueHash: "DO_NOT_RENDER_HASH",
    } as unknown as WorkspaceDomain;
    render(
      <DomainManagementPanel {...defaultProps({ domains: [hostileDomain] })} />,
    );
    expect(screen.queryByText(/DO_NOT_RENDER_HASH/)).not.toBeInTheDocument();
  });

  it("validates that the add-domain form rejects empty input without calling the handler", async () => {
    const onRegister = vi.fn();
    render(
      <DomainManagementPanel
        {...defaultProps({ onRegisterDomain: onRegister })}
      />,
    );

    const submit = screen.getByRole("button", { name: /add domain/i });
    await userEvent.click(submit);

    expect(onRegister).not.toHaveBeenCalled();
    // The form surfaces an inline validation hint.
    expect(
      await screen.findByText(/enter a domain to add/i),
    ).toBeInTheDocument();
  });

  it("submits the add-domain form with the trimmed hostname", async () => {
    const onRegister = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...defaultProps({ onRegisterDomain: onRegister })}
      />,
    );

    await userEvent.type(
      screen.getByLabelText(/^domain$/i),
      "  new.example.com  ",
    );
    await userEvent.click(screen.getByRole("button", { name: /add domain/i }));

    await waitFor(() => {
      expect(onRegister).toHaveBeenCalledTimes(1);
    });
    expect(onRegister).toHaveBeenCalledWith("new.example.com");
  });

  it("invokes the verify handler when the recheck button is clicked", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain],
          onVerifyDomain: onVerify,
        })}
      />,
    );

    const recheck = screen.getByRole("button", {
      name: new RegExp(
        `recheck verification.*${escapeRegExp(pendingDomain.hostname)}`,
        "i",
      ),
    });
    await userEvent.click(recheck);

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledTimes(1);
    });
    expect(onVerify).toHaveBeenCalledWith(pendingDomain.id);
  });

  it("requires confirmation before deleting a domain", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [verifiedDomain],
          onDeleteDomain: onDelete,
        })}
      />,
    );

    // First click opens the confirm dialog — handler must NOT fire yet.
    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(
          `disable.*${escapeRegExp(verifiedDomain.hostname)}`,
          "i",
        ),
      }),
    );
    expect(onDelete).not.toHaveBeenCalled();

    // Confirm dialog is now visible and announced.
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(
        new RegExp(escapeRegExp(verifiedDomain.hostname), "i"),
      ),
    ).toBeInTheDocument();

    // Cancel does NOT delete.
    await userEvent.click(
      within(dialog).getByRole("button", { name: /cancel/i }),
    );
    expect(onDelete).not.toHaveBeenCalled();

    // Reopen + confirm DOES delete.
    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(
          `disable.*${escapeRegExp(verifiedDomain.hostname)}`,
          "i",
        ),
      }),
    );
    const dialog2 = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog2).getByRole("button", { name: /^disable$/i }),
    );

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledTimes(1);
    });
    expect(onDelete).toHaveBeenCalledWith(verifiedDomain.id);
  });

  it("disables row actions while loading to avoid double-submits", () => {
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain],
          isLoading: true,
        })}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: new RegExp(
          `recheck verification.*${escapeRegExp(pendingDomain.hostname)}`,
          "i",
        ),
      }),
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /add domain/i })).toBeDisabled();
  });
});
