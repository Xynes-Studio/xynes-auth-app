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
    onRegenerateVerification: vi.fn().mockResolvedValue(undefined),
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

  // ── Phase C: status-aware destructive copy ───────────────────────────────
  //
  // The backend `platform.domains.delete` is a soft-delete that handles
  // any non-disabled status, so the FE drives copy off the row's current
  // status to match what the user actually intends. The same status
  // drives the ConfirmDialog so the button label and dialog conversation
  // match.

  it("renders 'Cancel' button copy on a pending domain row", () => {
    render(
      <DomainManagementPanel {...defaultProps({ domains: [pendingDomain] })} />,
    );
    const row = screen.getByTestId(`domain-row-${pendingDomain.id}`);
    // Button label is "Cancel" (not "Disable").
    expect(
      within(row).getByRole("button", { name: /^cancel/i }),
    ).toHaveTextContent(/^cancel$/i);
    // The "Disable" copy must NOT appear on this row.
    expect(within(row).queryByRole("button", { name: /^disable/i })).toBeNull();
  });

  it("renders 'Remove' button copy on a failed domain row", () => {
    render(
      <DomainManagementPanel {...defaultProps({ domains: [failedDomain] })} />,
    );
    const row = screen.getByTestId(`domain-row-${failedDomain.id}`);
    expect(
      within(row).getByRole("button", { name: /^remove/i }),
    ).toHaveTextContent(/^remove$/i);
    expect(within(row).queryByRole("button", { name: /^disable/i })).toBeNull();
    expect(within(row).queryByRole("button", { name: /^cancel/i })).toBeNull();
  });

  it("renders 'Disable' button copy on a verified domain row", () => {
    render(
      <DomainManagementPanel
        {...defaultProps({ domains: [verifiedDomain] })}
      />,
    );
    const row = screen.getByTestId(`domain-row-${verifiedDomain.id}`);
    expect(
      within(row).getByRole("button", { name: /^disable/i }),
    ).toHaveTextContent(/^disable$/i);
  });

  it("uses 'Cancel domain verification?' dialog title for a pending row", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain],
          onDeleteDomain: onDelete,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(
          `cancel domain verification for ${escapeRegExp(pendingDomain.hostname)}`,
          "i",
        ),
      }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/cancel domain verification\?/i),
    ).toBeInTheDocument();
    // Dialog confirm button label matches the action — it is NOT "Disable".
    expect(
      within(dialog).getByRole("button", { name: /cancel verification/i }),
    ).toBeInTheDocument();
    // The dialog must NOT promise traffic-stopping behaviour for a row
    // that has never accepted any traffic.
    expect(within(dialog).queryByText(/stop accepting traffic/i)).toBeNull();
  });

  it("uses 'Remove failed domain?' dialog title for a failed row", async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [failedDomain],
          onDeleteDomain: onDelete,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(
          `remove failed domain ${escapeRegExp(failedDomain.hostname)}`,
          "i",
        ),
      }),
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(/remove failed domain\?/i),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: /^remove$/i }),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/stop accepting traffic/i)).toBeNull();
  });

  it("calls onDeleteDomain with the pending row's id from the Cancel dialog", async () => {
    // Backend contract: same `platform.domains.delete` action regardless of
    // status. The FE only renames the button + dialog copy.
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain],
          onDeleteDomain: onDelete,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(
          `cancel domain verification for ${escapeRegExp(pendingDomain.hostname)}`,
          "i",
        ),
      }),
    );
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: /cancel verification/i }),
    );
    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(pendingDomain.id);
    });
  });

  // ── Phase D: recopy + regenerate UI + diagnostic strip ──────────────────

  it("renders a 'Copy verification value' button only while a fresh reveal is active", () => {
    // No reveal slot → no Copy button (the secret can't be recopied
    // because the server stores ONLY the SHA-256 hash; a stale reveal
    // would lie about what the user actually has).
    const { rerender } = render(
      <DomainManagementPanel {...defaultProps({ domains: [pendingDomain] })} />,
    );
    expect(
      screen.queryByRole("button", { name: /copy verification value/i }),
    ).toBeNull();

    rerender(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain],
          pendingVerificationValue: {
            domainId: pendingDomain.id,
            verificationValue: "xynes-verify=abc123",
          },
        })}
      />,
    );
    expect(
      screen.getByRole("button", { name: /copy verification value/i }),
    ).toBeInTheDocument();
  });

  it("calls navigator.clipboard.writeText with the raw verification value when Copy is clicked", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    // Stub the clipboard API for this test only — `defineProperty` is
    // safer than reassigning the read-only `navigator.clipboard`.
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain],
          pendingVerificationValue: {
            domainId: pendingDomain.id,
            verificationValue: "xynes-verify=copythisvalue",
          },
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /copy verification value/i }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith("xynes-verify=copythisvalue");
    });
  });

  it("renders a 'Get new value' button on pending and failed rows but not verified rows", () => {
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain, failedDomain, verifiedDomain],
        })}
      />,
    );

    // Pending row gets the regenerate CTA.
    expect(
      screen.getByRole("button", {
        name: new RegExp(
          `get a new verification value for ${escapeRegExp(pendingDomain.hostname)}`,
          "i",
        ),
      }),
    ).toBeInTheDocument();

    // Failed row gets the regenerate CTA.
    expect(
      screen.getByRole("button", {
        name: new RegExp(
          `get a new verification value for ${escapeRegExp(failedDomain.hostname)}`,
          "i",
        ),
      }),
    ).toBeInTheDocument();

    // Verified row must NOT get the regenerate CTA — regenerating a
    // verified domain would silently revoke verification, which is the
    // backend 409 path. The panel guards against that by hiding the
    // button entirely.
    expect(
      screen.queryByRole("button", {
        name: new RegExp(
          `get a new verification value for ${escapeRegExp(verifiedDomain.hostname)}`,
          "i",
        ),
      }),
    ).toBeNull();
  });

  it("calls onRegenerateVerification(domainId) when the Get-new-value button is clicked", async () => {
    const onRegenerate = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...defaultProps({
          domains: [pendingDomain],
          onRegenerateVerification: onRegenerate,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: new RegExp(
          `get a new verification value for ${escapeRegExp(pendingDomain.hostname)}`,
          "i",
        ),
      }),
    );

    await waitFor(() => {
      expect(onRegenerate).toHaveBeenCalledWith(pendingDomain.id);
    });
  });

  // ── Diagnostic strip — Phase B+D ─────────────────────────────────────

  it("does not render the diagnostic strip on a pending row (no diagnosis available yet)", () => {
    render(
      <DomainManagementPanel {...defaultProps({ domains: [pendingDomain] })} />,
    );
    expect(
      screen.queryByTestId(`domain-diagnostic-strip-${pendingDomain.id}`),
    ).toBeNull();
  });

  it("renders a 3-step strip on a failed row with NXDOMAIN", () => {
    const nxDomain: WorkspaceDomain = {
      ...failedDomain,
      id: "dom-nxdomain",
      hostname: "nope.example.com",
      failureCode: "NXDOMAIN",
      failureMessage:
        "No DNS record found at the verification name yet. DNS propagation can take up to 24h.",
      dnsRecordsFound: null,
    };
    render(
      <DomainManagementPanel {...defaultProps({ domains: [nxDomain] })} />,
    );

    const strip = screen.getByTestId(`domain-diagnostic-strip-${nxDomain.id}`);
    expect(strip).toHaveAttribute(
      "aria-label",
      `Verification diagnostic for ${nxDomain.hostname}`,
    );

    // Step 1 fails with "No record found"; steps 2 + 3 are skipped (we
    // can't enumerate records or compare values without a successful
    // DNS lookup).
    const items = within(strip).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute("data-status", "fail");
    expect(items[0]).toHaveTextContent(/dns lookup/i);
    expect(items[0]).toHaveTextContent(/no record found/i);
    expect(items[1]).toHaveAttribute("data-status", "skipped");
    expect(items[2]).toHaveAttribute("data-status", "skipped");
  });

  it("renders the strip with TXT-records-found pass + value-match fail on MISMATCH", () => {
    const mismatch: WorkspaceDomain = {
      ...failedDomain,
      id: "dom-mismatch",
      hostname: "mismatch.example.com",
      failureCode: "MISMATCH",
      failureMessage:
        "Found 3 TXT records at the verification name, but none matched.",
      dnsRecordsFound: 3,
    };
    render(
      <DomainManagementPanel {...defaultProps({ domains: [mismatch] })} />,
    );

    const strip = screen.getByTestId(`domain-diagnostic-strip-${mismatch.id}`);
    const items = within(strip).getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("data-status", "pass");
    expect(items[0]).toHaveTextContent(/dns lookup/i);

    expect(items[1]).toHaveAttribute("data-status", "pass");
    // Count comes through; raw record values do NOT.
    expect(items[1]).toHaveTextContent(/3 found/i);

    expect(items[2]).toHaveAttribute("data-status", "fail");
    expect(items[2]).toHaveTextContent(/no record matched/i);
  });

  it("renders the strip with NO_RECORDS marking step 2 as fail", () => {
    const noRecords: WorkspaceDomain = {
      ...failedDomain,
      id: "dom-norecords",
      hostname: "empty.example.com",
      failureCode: "NO_RECORDS",
      failureMessage:
        "No TXT records found at the verification name. DNS propagation can take up to 24h.",
      dnsRecordsFound: 0,
    };
    render(
      <DomainManagementPanel {...defaultProps({ domains: [noRecords] })} />,
    );

    const strip = screen.getByTestId(`domain-diagnostic-strip-${noRecords.id}`);
    const items = within(strip).getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("data-status", "pass");
    expect(items[1]).toHaveAttribute("data-status", "fail");
    expect(items[1]).toHaveTextContent(/0 found/i);
    expect(items[2]).toHaveAttribute("data-status", "skipped");
  });

  it("renders an all-pass strip on a verified row", () => {
    render(
      <DomainManagementPanel
        {...defaultProps({ domains: [verifiedDomain] })}
      />,
    );

    const strip = screen.getByTestId(
      `domain-diagnostic-strip-${verifiedDomain.id}`,
    );
    const items = within(strip).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item).toHaveAttribute("data-status", "pass");
    }
    // Match step explicitly says "Matched" so SR users hear the
    // resolution rather than just an icon.
    expect(items[2]).toHaveTextContent(/matched/i);
  });

  it("never echoes a hostile dnsRecordsFound array (count-only contract)", () => {
    // Defense in depth: the client normalizer should already coerce
    // anything non-numeric to null, but if the panel ever started
    // rendering this field directly, an attacker-supplied DNS zone
    // could feed strings or arrays through. The strip must not crash
    // and must not echo such data.
    const hostile = {
      ...failedDomain,
      id: "dom-hostile-count",
      hostname: "hostile.example.com",
      failureCode: "MISMATCH",
      dnsRecordsFound: ["leaked-record-a", "leaked-record-b"],
    } as unknown as WorkspaceDomain;
    render(<DomainManagementPanel {...defaultProps({ domains: [hostile] })} />);

    expect(screen.queryByText(/leaked-record-a/)).toBeNull();
    expect(screen.queryByText(/leaked-record-b/)).toBeNull();
  });

  it("disables the Get-new-value button while loading to avoid double-submits", () => {
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
          `get a new verification value for ${escapeRegExp(pendingDomain.hostname)}`,
          "i",
        ),
      }),
    ).toBeDisabled();
  });
});
