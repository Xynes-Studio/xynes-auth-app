import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DomainManagementPanel } from "./DomainManagementPanel";
import type { WorkspaceDomain } from "@/lib/integrations/workspace-integrations-types";

// BUG-AUTH-7: shared module-level toast spy. Declared via `vi.hoisted`
// so the `vi.mock` factory below — which is itself hoisted — can refer
// to it without a temporal-dead-zone error. Each `beforeEach`
// clears it so per-test assertions stay isolated.
const { showToastMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
}));

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
    "aria-busy": ariaBusy,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
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
      description,
      variant,
      "data-testid": dataTestId,
    }: {
      children?: React.ReactNode;
      title?: React.ReactNode;
      description?: React.ReactNode;
      variant?: string;
      "data-testid"?: string;
    }) => (
      <div role="alert" data-variant={variant} data-testid={dataTestId}>
        {title ? <strong>{title}</strong> : null}
        {description ? <p>{description}</p> : null}
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
    // BUG-AUTH-7: surface the success toast on the panel's
    // auto-recheck success path. The container test recipe binds the
    // mock to a module-level spy in the existing
    // `AuthDashboardShell.integration.test.tsx`; in this panel-level
    // test we install the spy per-suite (see `showToastMock` below)
    // so individual assertions can interrogate the call without
    // cross-test bleed.
    useToast: () => ({ show: showToastMock, dismiss: vi.fn() }),
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

  // ── Disabled-row destructive CTA suppression ────────────────────────
  //
  // A `disabled` row is the soft-deleted result of an earlier
  // platform.domains.delete. Re-rendering "Disable" for it would
  // dispatch another pointless delete and confuse the operator.
  // CodeRabbit review (PR #47) flagged this as a fall-through bug
  // because `destructiveCopy("disabled")` defaulted to the verified
  // copy.

  it("does NOT render a destructive button for a disabled domain row", () => {
    const disabledDomain: WorkspaceDomain = {
      id: "dom-disabled",
      hostname: "disabled.example.com",
      status: "disabled",
      verificationMethod: "dns_txt",
      verificationName: "_xynes.disabled.example.com",
    };
    render(
      <DomainManagementPanel
        {...defaultProps({ domains: [disabledDomain] })}
      />,
    );
    const row = screen.getByTestId(`domain-row-${disabledDomain.id}`);
    // None of the destructive copy variants should render on a
    // disabled row.
    expect(within(row).queryByRole("button", { name: /^disable/i })).toBeNull();
    expect(within(row).queryByRole("button", { name: /^remove/i })).toBeNull();
    expect(within(row).queryByRole("button", { name: /^cancel/i })).toBeNull();
  });

  it("does NOT render a Get-new-value button for a disabled domain row", () => {
    // The Get-new-value CTA is gated on `showRecheck`, which is
    // already false for disabled rows; this test pins that contract
    // alongside the destructive CTA suppression test above so they
    // can't drift apart.
    const disabledDomain: WorkspaceDomain = {
      id: "dom-disabled-2",
      hostname: "disabled2.example.com",
      status: "disabled",
      verificationMethod: "dns_txt",
      verificationName: "_xynes.disabled2.example.com",
    };
    render(
      <DomainManagementPanel
        {...defaultProps({ domains: [disabledDomain] })}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /get a new verification value/i }),
    ).toBeNull();
  });

  // ── recordsStep `skipped` fallback for failed rows ──────────────────
  //
  // When a failed row carries a known failureCode that doesn't itself
  // pin the records step (e.g. an unforeseen future code that survives
  // the allowlist) but no trustworthy `dnsRecordsFound`, the strip
  // must NOT default to a green check. CodeRabbit review (PR #47)
  // flagged the prior behaviour where the `else` fallback drew "pass".

  it("renders TXT records as 'skipped' on a failed row missing dnsRecordsFound", () => {
    // Construct a failed row whose failureCode survives the allowlist
    // but doesn't pin step 2 (e.g. MISMATCH). Drop dnsRecordsFound to
    // simulate older rows or a transient backend gap.
    const failedNoCount: WorkspaceDomain = {
      ...failedDomain,
      id: "dom-failed-nocount",
      hostname: "nocount.example.com",
      failureCode: "MISMATCH",
      // dnsRecordsFound omitted on purpose
    };
    render(
      <DomainManagementPanel {...defaultProps({ domains: [failedNoCount] })} />,
    );
    const strip = screen.getByTestId(
      `domain-diagnostic-strip-${failedNoCount.id}`,
    );
    const items = within(strip).getAllByRole("listitem");
    // Step 1: DNS lookup passed (MISMATCH implies a successful resolve).
    expect(items[0]).toHaveAttribute("data-status", "pass");
    // Step 2: must be 'skipped' — NOT 'pass' — because we have no
    // trustworthy count to report.
    expect(items[1]).toHaveAttribute("data-status", "skipped");
    expect(items[1]).toHaveTextContent(/—/);
    // Step 3: still flagged 'fail' because the row's status === failed
    // and the code is MISMATCH.
    expect(items[2]).toHaveAttribute("data-status", "fail");
  });

  it("still renders TXT records as 'pass' on a verified row missing dnsRecordsFound (legacy data)", () => {
    // Verified rows from before Phase B don't carry the count. Trust
    // the verified status — they were confirmed at some point.
    const verifiedNoCount: WorkspaceDomain = {
      ...verifiedDomain,
      id: "dom-verified-nocount",
      // dnsRecordsFound omitted on purpose
    };
    render(
      <DomainManagementPanel
        {...defaultProps({ domains: [verifiedNoCount] })}
      />,
    );
    const strip = screen.getByTestId(
      `domain-diagnostic-strip-${verifiedNoCount.id}`,
    );
    const items = within(strip).getAllByRole("listitem");
    expect(items[1]).toHaveAttribute("data-status", "pass");
    expect(items[1]).toHaveTextContent(/found/i);
  });
});

// ── WSA-FIX-3: DNS instructions split + auto-recheck ──────────────────
//
// The reveal block now renders Type/Name(short)/Name(full)/Value/TTL as
// a structured `<dl>` with per-cell Copy buttons, and the
// "I've added it" button auto-triggers `onVerifyDomain` instead of
// silently dismissing the reveal.

describe("WSA-FIX-3: structured DNS instructions reveal", () => {
  function pendingRevealProps(
    overrides: Partial<React.ComponentProps<typeof DomainManagementPanel>> = {},
  ) {
    return defaultProps({
      domains: [pendingDomain],
      pendingVerificationValue: {
        domainId: pendingDomain.id,
        verificationValue: "xynes-verify=abc123",
      },
      ...overrides,
    });
  }

  it("renders Type / Name (subdomain only) / Name (full FQDN) / Value / TTL cells in the reveal", () => {
    render(<DomainManagementPanel {...pendingRevealProps()} />);

    const instructions = screen.getByTestId("domain-verification-instructions");
    expect(instructions).toHaveAttribute(
      "aria-label",
      "DNS TXT record values to add",
    );

    expect(within(instructions).getByText(/^type$/i)).toBeInTheDocument();
    expect(
      within(instructions).getByText(/name \(subdomain only\)/i),
    ).toBeInTheDocument();
    expect(
      within(instructions).getByText(/name \(full fqdn\)/i),
    ).toBeInTheDocument();
    expect(within(instructions).getByText(/^value$/i)).toBeInTheDocument();
    expect(within(instructions).getByText(/^ttl$/i)).toBeInTheDocument();
  });

  it("renders each cell with its own labelled Copy button", () => {
    render(<DomainManagementPanel {...pendingRevealProps()} />);

    expect(
      screen.getByRole("button", { name: /copy dns record type/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /copy dns record name, subdomain-only form/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /copy dns record name, full fqdn form/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /copy dns record value/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /copy dns record ttl/i }),
    ).toBeInTheDocument();
  });

  it("renders the FQDN cell with the full verificationName from the active row", () => {
    render(<DomainManagementPanel {...pendingRevealProps()} />);
    const instructions = screen.getByTestId("domain-verification-instructions");
    expect(
      within(instructions).getByText(pendingDomain.verificationName),
    ).toBeInTheDocument();
  });

  it("renders the subdomain-only cell with the bare `_xynes` label for an apex hostname", () => {
    // pendingDomain.hostname = "pending.example.com",
    // pendingDomain.verificationName = "_xynes.pending.example.com"
    // → subdomain-only = "_xynes"
    render(<DomainManagementPanel {...pendingRevealProps()} />);
    const cell = screen.getByTestId("domain-verification-cell-name-short");
    // Cell text includes the dt label, the value, the hint, and the
    // Copy button. We only need to confirm the derived subdomain is
    // present; ordering / surrounding text is incidental.
    expect(cell).toHaveTextContent(/_xynes/);
    // Defensive: must NOT include the FQDN apex inside the
    // subdomain-only cell — that would defeat the whole purpose.
    expect(cell).not.toHaveTextContent(/pending\.example\.com/);
    // The hint disambiguates Name(short) vs Name(FQDN) for users.
    expect(cell).toHaveTextContent(/cloudflare|namecheap|godaddy/i);
  });

  it("includes a 'Where do I add this?' disclosure with provider notes and a docs link", () => {
    render(<DomainManagementPanel {...pendingRevealProps()} />);

    const disclosure = screen.getByText(/where do i add this/i);
    expect(disclosure).toBeInTheDocument();

    // Scope provider note assertions to the disclosure's parent
    // <details> so we don't collide with the subdomain-cell hint
    // (which also mentions Cloudflare). `getAllByText` is fine
    // because we just need to know there's at least one match.
    expect(screen.getAllByText(/cloudflare/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/route 53/i).length).toBeGreaterThan(0);

    // Docs link opens in a new tab with safe rel attributes and a
    // screen-reader hint for AT users.
    const docsLink = screen.getByRole("link", {
      name: /full domain verification guide/i,
    });
    expect(docsLink).toHaveAttribute("target", "_blank");
    expect(docsLink.getAttribute("rel") ?? "").toMatch(/noopener/);
    expect(docsLink.getAttribute("rel") ?? "").toMatch(/noreferrer/);
    expect(docsLink.getAttribute("href") ?? "").toMatch(/^https:\/\//);
    // Screen-reader-only "(opens in new tab)" hint must be present.
    expect(docsLink).toHaveTextContent(/opens in new tab/i);
  });

  it("never echoes a hash-shaped field in the reveal (defense in depth)", () => {
    // Even if a hostile prop ever carried a Hash-ending field down,
    // the reveal must not render it. The reveal only consumes
    // `verificationValue` from `pendingVerificationValue` and
    // `verificationName`/`hostname` from the active row.
    const hostile = {
      ...pendingDomain,
      verificationValueHash: "DO_NOT_RENDER_HASH",
    } as unknown as WorkspaceDomain;
    render(
      <DomainManagementPanel {...pendingRevealProps({ domains: [hostile] })} />,
    );
    expect(screen.queryByText(/DO_NOT_RENDER_HASH/)).toBeNull();
  });

  it("calls navigator.clipboard.writeText with the cell-specific value for each Copy button", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<DomainManagementPanel {...pendingRevealProps()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /copy dns record type/i }),
    );
    expect(writeText).toHaveBeenLastCalledWith("TXT");

    await userEvent.click(
      screen.getByRole("button", { name: /copy dns record value/i }),
    );
    expect(writeText).toHaveBeenLastCalledWith("xynes-verify=abc123");

    await userEvent.click(
      screen.getByRole("button", {
        name: /copy dns record name, subdomain-only form/i,
      }),
    );
    expect(writeText).toHaveBeenLastCalledWith("_xynes");

    await userEvent.click(
      screen.getByRole("button", {
        name: /copy dns record name, full fqdn form/i,
      }),
    );
    expect(writeText).toHaveBeenLastCalledWith(pendingDomain.verificationName);
  });

  it("preserves the legacy 'Copy verification value' affordance (back-compat for skim readers)", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(<DomainManagementPanel {...pendingRevealProps()} />);

    // The Copy-value pill button below the table copies the raw
    // value, matching the pre-WSA-FIX-3 Copy button's behaviour so
    // existing muscle memory and the back-compat test query keep
    // working.
    await userEvent.click(
      screen.getByRole("button", { name: /copy verification value/i }),
    );
    expect(writeText).toHaveBeenCalledWith("xynes-verify=abc123");
  });
});

describe("WSA-FIX-3: 'I've added it' auto-rechecks DNS", () => {
  function pendingRevealProps(
    overrides: Partial<React.ComponentProps<typeof DomainManagementPanel>> = {},
  ) {
    return defaultProps({
      domains: [pendingDomain],
      pendingVerificationValue: {
        domainId: pendingDomain.id,
        verificationValue: "xynes-verify=abc123",
      },
      ...overrides,
    });
  }

  it("calls onVerifyDomain with the active reveal's domainId when the user clicks 'I've added it'", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...pendingRevealProps({ onVerifyDomain: onVerify })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledWith(pendingDomain.id);
    });
  });

  it("dismisses the reveal AFTER a successful recheck flips the row to verified", async () => {
    // Mimic the container: when `onVerifyDomain` resolves successfully,
    // the next render's `domains` carries the flipped status. We
    // simulate that with rerender + a verified row that shares the
    // pending id.
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    const verifiedAfter: WorkspaceDomain = {
      ...pendingDomain,
      status: "verified",
      verifiedAt: "2026-05-12T00:00:00.000Z",
    };

    const { rerender } = render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: async (id) => {
            await onVerify(id);
            // After this awaits, rerender simulates the container
            // re-flowing the freshly-verified row into props.
            rerender(
              <DomainManagementPanel
                {...pendingRevealProps({
                  domains: [verifiedAfter],
                  onVerifyDomain: onVerify,
                  onDismissVerificationValue: onDismiss,
                })}
              />,
            );
          },
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );

    // BUG-AUTH-7: the panel now waits ~1.5s after the success state
    // before firing `onDismissVerificationValue` so the user can read
    // the inline confirmation + toast. Bump the waitFor budget so
    // this assertion accommodates the new auto-dismiss timer
    // (DNS_INSTRUCTION_COPY.autoDismissAfterMs = 1500ms).
    await waitFor(
      () => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 },
    );
  });

  it("keeps the reveal open and announces 'Still propagating' when recheck does not flip the row to verified", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: onVerify,
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledTimes(1);
    });
    // Reveal still mounted — container hasn't dismissed.
    expect(onDismiss).not.toHaveBeenCalled();
    expect(
      screen.getByTestId("domain-verification-reveal"),
    ).toBeInTheDocument();

    // The polite region announces the "still propagating" copy.
    const status = screen.getByTestId("domain-verification-reveal-status");
    expect(status).toHaveAttribute("role", "status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(/propagating|24 hours/i);
  });

  it("keeps the reveal open and announces 'Still propagating' when the recheck call rejects", async () => {
    const onVerify = vi
      .fn()
      .mockRejectedValue(new Error("transient network error"));
    const onDismiss = vi.fn();
    render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: onVerify,
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );

    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledTimes(1);
    });
    // Reveal stays open + reveal button is enabled again for a retry.
    expect(onDismiss).not.toHaveBeenCalled();
    const button = screen.getByRole("button", {
      name: /i've added it\. recheck dns now/i,
    });
    expect(button).not.toBeDisabled();
    // Polite region announces propagation/retry copy.
    expect(
      screen.getByTestId("domain-verification-reveal-status"),
    ).toHaveTextContent(/propagating|24 hours/i);
  });

  it("provides a separate 'Dismiss' button that closes the reveal without rechecking", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: onVerify,
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", {
        name: /dismiss verification value without rechecking/i,
      }),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onVerify).not.toHaveBeenCalled();
  });

  it("sets aria-busy=true and shows 'Re-checking…' on the button while the auto-recheck is in flight, and clears them when it resolves", async () => {
    // Hold the verify call in pending state so we can observe the
    // mid-flight aria-busy + label change before it resolves.
    let resolveVerify: (() => void) | undefined;
    const onVerify = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveVerify = resolve;
        }),
    );
    render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: onVerify,
        })}
      />,
    );

    const button = screen.getByRole("button", {
      name: /i've added it\. recheck dns now/i,
    });
    expect(button).not.toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent(/i.?ve added it/i);

    await userEvent.click(button);

    // Mid-flight: aria-busy=true, label flips to "Re-checking…".
    await waitFor(() => {
      expect(button).toHaveAttribute("aria-busy", "true");
    });
    expect(button).toHaveTextContent(/re-?checking/i);
    expect(button).toBeDisabled();

    // Resolve the verify call and assert the busy state clears.
    resolveVerify?.();
    await waitFor(() => {
      expect(button).not.toHaveAttribute("aria-busy", "true");
    });
    expect(button).not.toBeDisabled();
  });
});

// ── BUG-AUTH-7: DNS TXT verification modal UX ─────────────────────────
//
// New behaviour landed on top of WSA-FIX-3:
//   1. The dense "We only show this value once" sentence is now a
//      real Lumia DS Alert (variant="warning") at the top of the
//      reveal.
//   2. The helperHeading paragraph is replaced by a numbered <ol>
//      of three short steps.
//   3. A successful auto-recheck surfaces a Lumia success toast and
//      auto-dismisses the reveal after `autoDismissAfterMs` (1.5s).
//   4. A failed auto-recheck renders a Lumia destructive Alert in
//      the reveal so the failure state has a stable visual anchor
//      (not just a polite live-region announcement). The reveal
//      stays open so users can re-copy the value and retry.
//   5. Manual Dismiss cancels any pending auto-dismiss timer so a
//      stale post-success timer can never fire after manual
//      dismissal.

describe("BUG-AUTH-7: DNS TXT verification modal UX", () => {
  function pendingRevealProps(
    overrides: Partial<React.ComponentProps<typeof DomainManagementPanel>> = {},
  ) {
    return defaultProps({
      domains: [pendingDomain],
      pendingVerificationValue: {
        domainId: pendingDomain.id,
        verificationValue: "xynes-verify=abc123",
      },
      ...overrides,
    });
  }

  it("renders the 'we only show this value once' warning as a Lumia Alert (not a paragraph)", () => {
    render(<DomainManagementPanel {...pendingRevealProps()} />);
    const warning = screen.getByTestId("domain-verification-one-time-warning");
    // The Alert mock spreads variant on a data-variant attribute and
    // applies role="alert". Both must be present.
    expect(warning).toHaveAttribute("data-variant", "warning");
    expect(warning).toHaveAttribute("role", "alert");
    // Title + description copy comes through DNS_INSTRUCTION_COPY so
    // the message stays single-sourced for the eventual i18n move.
    expect(warning).toHaveTextContent(/we only show this value once/i);
    expect(warning).toHaveTextContent(/get new value/i);
  });

  it("renders three numbered steps explaining how to add the TXT record", () => {
    render(<DomainManagementPanel {...pendingRevealProps()} />);
    const steps = screen.getByTestId("domain-verification-steps");
    expect(steps.tagName.toLowerCase()).toBe("ol");
    expect(steps).toHaveAttribute(
      "aria-label",
      "How to add the DNS TXT record",
    );
    const items = within(steps).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    // Each step is one sentence; the third explicitly directs the
    // user back to the verify button (closing the loop).
    expect(items[0]).toHaveTextContent(/log in to your dns provider/i);
    expect(items[1]).toHaveTextContent(/add this txt record/i);
    expect(items[2]).toHaveTextContent(/verify domain/i);
  });

  it("fires a Lumia success toast AND auto-dismisses the reveal after autoDismissAfterMs on a successful recheck", async () => {
    // Mimic the container's "flip to verified" rerender so the
    // post-call `domainsRef.current.find(...)` sees a verified row.
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    const verifiedAfter: WorkspaceDomain = {
      ...pendingDomain,
      status: "verified",
      verifiedAt: "2026-06-01T00:00:00.000Z",
    };

    const { rerender } = render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: async (id) => {
            await onVerify(id);
            rerender(
              <DomainManagementPanel
                {...pendingRevealProps({
                  domains: [verifiedAfter],
                  onVerifyDomain: onVerify,
                  onDismissVerificationValue: onDismiss,
                })}
              />,
            );
          },
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );

    // Toast fires immediately on the success transition, BEFORE the
    // auto-dismiss timer elapses, so the user sees the confirmation
    // both inline and as a transient toast.
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledTimes(1);
    });
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "success",
        title: expect.stringMatching(/domain verified/i),
      }),
    );

    // onDismiss is NOT called synchronously — the panel waits the
    // 1.5s autoDismissAfterMs window so the user can read the
    // success state and the toast. The waitFor budget covers the
    // configured delay.
    await waitFor(
      () => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 },
    );
  });

  it("renders a destructive Alert and keeps the reveal open when the auto-recheck does not flip the row to verified", async () => {
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: onVerify,
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    // No destructive Alert before the recheck runs.
    expect(
      screen.queryByTestId("domain-verification-failure-alert"),
    ).toBeNull();
    // Toast must not fire on the failure path.
    expect(showToastMock).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );

    // The destructive Alert renders with the documented failure copy
    // and reads as `role="alert"` (Lumia Alert maps error → role=alert).
    const failure = await screen.findByTestId(
      "domain-verification-failure-alert",
    );
    expect(failure).toHaveAttribute("data-variant", "error");
    expect(failure).toHaveAttribute("role", "alert");
    // Match around the apostrophe (the copy uses the curly U+2019
    // apostrophe but tests should be apostrophe-agnostic so they
    // continue to pass if the copy ever flips to a straight quote).
    expect(failure).toHaveTextContent(/couldn.{0,1}t find the txt record/i);
    expect(failure).toHaveTextContent(/dns changes can take up to 48 hours/i);

    // Reveal stays open + no toast + no dismiss.
    expect(
      screen.getByTestId("domain-verification-reveal"),
    ).toBeInTheDocument();
    expect(showToastMock).not.toHaveBeenCalled();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("removes the destructive Alert when the user retries the recheck (transient outcome state, not sticky)", async () => {
    // First recheck fails; user re-clicks; while the second call is
    // mid-flight the destructive Alert MUST disappear (we set
    // outcome back to "idle" before awaiting). This prevents a
    // confusing "showing the failure callout DURING a retry" state.
    let inflight: Promise<void> | null = null;
    let resolveSecond: (() => void) | undefined;
    const onVerify = vi
      .fn()
      .mockImplementationOnce(async () => {
        // First call: resolve immediately (failure path — row stays pending).
      })
      .mockImplementationOnce(() => {
        inflight = new Promise<void>((resolve) => {
          resolveSecond = resolve;
        });
        return inflight;
      });
    render(
      <DomainManagementPanel
        {...pendingRevealProps({ onVerifyDomain: onVerify })}
      />,
    );

    const button = screen.getByRole("button", {
      name: /i've added it\. recheck dns now/i,
    });
    await userEvent.click(button);

    // First call resolved — destructive Alert is up.
    await screen.findByTestId("domain-verification-failure-alert");

    // Click again — the Alert must clear synchronously when the
    // new recheck starts (we reset outcome to "idle" before await).
    await userEvent.click(button);
    await waitFor(() => {
      expect(
        screen.queryByTestId("domain-verification-failure-alert"),
      ).toBeNull();
    });
    // Release the second call so React unmounts cleanly.
    resolveSecond?.();
    await waitFor(() => {
      expect(onVerify).toHaveBeenCalledTimes(2);
    });
  });

  it("manual Dismiss cancels a pending auto-dismiss timer (regression guard for stale-timer dismiss)", async () => {
    // Edge case: a success path schedules the 1.5s auto-dismiss,
    // but the user clicks the manual Dismiss button immediately.
    // The auto-dismiss timer must be cancelled — otherwise the
    // container's slot would be cleared a second time when the
    // timer fires (which is a no-op on the live container but a
    // failed call-count assertion in tests, and a fragile
    // implementation contract). After manual dismiss, no
    // additional onDismiss call may arrive.
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();

    const verifiedAfter: WorkspaceDomain = {
      ...pendingDomain,
      status: "verified",
      verifiedAt: "2026-06-01T00:00:00.000Z",
    };

    const { rerender } = render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: async (id) => {
            await onVerify(id);
            rerender(
              <DomainManagementPanel
                {...pendingRevealProps({
                  domains: [verifiedAfter],
                  onVerifyDomain: onVerify,
                  onDismissVerificationValue: onDismiss,
                })}
              />,
            );
          },
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );

    // Wait for the success transition (toast fires synchronously
    // with the outcome flip; the auto-dismiss timer is scheduled
    // immediately after).
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledTimes(1);
    });

    // Click Dismiss BEFORE the 1.5s timer fires.
    await userEvent.click(
      screen.getByRole("button", {
        name: /dismiss verification value without rechecking/i,
      }),
    );
    expect(onDismiss).toHaveBeenCalledTimes(1);

    // Give the original 1.5s timer time to potentially fire. If the
    // timer wasn't cancelled, onDismiss would be called a SECOND
    // time and this assertion would fail.
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("never echoes hash-shaped fields anywhere in the reveal (warning Alert, steps, destructive Alert) — defense in depth", async () => {
    // Hostile prop with a verificationValueHash field. None of the
    // BUG-AUTH-7 surfaces (warning, steps, destructive Alert) may
    // ever echo a hash-shaped value.
    const hostile = {
      ...pendingDomain,
      verificationValueHash: "DO_NOT_RENDER_HASH_BUG_AUTH_7",
    } as unknown as WorkspaceDomain;
    const onVerify = vi.fn().mockResolvedValue(undefined);
    render(
      <DomainManagementPanel
        {...pendingRevealProps({
          domains: [hostile],
          onVerifyDomain: onVerify,
        })}
      />,
    );

    // Idle state — no hash anywhere.
    expect(screen.queryByText(/DO_NOT_RENDER_HASH_BUG_AUTH_7/)).toBeNull();
    // Drive a failure path so the destructive Alert is mounted too.
    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );
    await screen.findByTestId("domain-verification-failure-alert");
    expect(screen.queryByText(/DO_NOT_RENDER_HASH_BUG_AUTH_7/)).toBeNull();
  });
});

// ── BUG-AUTH-7 Codex follow-up: copy-feedback / auto-dismiss timers ──
//
// Codex flagged on PR #70 that the copy-feedback timer was aliasing
// the BUG-AUTH-7 auto-dismiss timer ref. Two regressions: (a) a copy
// click during a successful auto-recheck overwrote the auto-dismiss
// timer; (b) a fresh reveal cancelled the copy timer through the
// reveal-change cleanup but did not reset `copiedCellKey`, so the
// new value could render as already "Copied". The fix uses a bare
// setTimeout for the copy timer and explicitly resets
// `copiedCellKey` on reveal change.

describe("BUG-AUTH-7 Codex follow-up: copy-feedback + auto-dismiss timer isolation", () => {
  function pendingRevealProps(
    overrides: Partial<React.ComponentProps<typeof DomainManagementPanel>> = {},
  ) {
    return defaultProps({
      domains: [pendingDomain],
      pendingVerificationValue: {
        domainId: pendingDomain.id,
        verificationValue: "xynes-verify=abc123",
      },
      ...overrides,
    });
  }

  it("a copy click during a pending auto-dismiss must NOT cancel the auto-dismiss timer (regression guard)", async () => {
    // Drive the success path so the auto-dismiss timer is armed,
    // then click a Copy button before the 1.5s elapses, then assert
    // onDismiss STILL fires.
    const onVerify = vi.fn().mockResolvedValue(undefined);
    const onDismiss = vi.fn();
    const verifiedAfter: WorkspaceDomain = {
      ...pendingDomain,
      status: "verified",
      verifiedAt: "2026-06-01T00:00:00.000Z",
    };
    const { rerender } = render(
      <DomainManagementPanel
        {...pendingRevealProps({
          onVerifyDomain: async (id) => {
            await onVerify(id);
            rerender(
              <DomainManagementPanel
                {...pendingRevealProps({
                  domains: [verifiedAfter],
                  onVerifyDomain: onVerify,
                  onDismissVerificationValue: onDismiss,
                })}
              />,
            );
          },
          onDismissVerificationValue: onDismiss,
        })}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /i've added it\. recheck dns now/i }),
    );

    // Wait for the success transition (toast fires synchronously
    // with the outcome flip; auto-dismiss timer is now armed).
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledTimes(1);
    });

    // Click a Copy button BEFORE the auto-dismiss fires. Pre-fix,
    // this overwrote `autoDismissTimerRef.current` with the copy
    // timer's id; the original auto-dismiss timer kept ticking but
    // could no longer be cleaned up — and worse, a manual dismiss
    // would cancel the copy timer instead of the auto-dismiss timer.
    await userEvent.click(
      screen.getByRole("button", { name: /copy dns record type/i }),
    );

    // The auto-dismiss timer MUST still fire. We give it ample
    // budget (3s) to cover the 1.5s configured delay plus React
    // commit overhead.
    await waitFor(
      () => {
        expect(onDismiss).toHaveBeenCalledTimes(1);
      },
      { timeout: 3000 },
    );
  });

  it("a fresh reveal value renders WITHOUT a stale 'Copied' pill on the same cell key (regression guard)", async () => {
    // User copies the current TXT value. Container then provides a
    // fresh `verificationValue` (e.g. via "Get new value"). The
    // reveal-change cleanup effect MUST reset `copiedCellKey` so
    // the new (different) value's Copy button renders as "Copy",
    // not "Copied".
    const initialProps = pendingRevealProps();
    const { rerender } = render(
      <DomainManagementPanel {...initialProps} />,
    );

    // Click Copy on the Type cell — sets copiedCellKey="type".
    await userEvent.click(
      screen.getByRole("button", { name: /copy dns record type/i }),
    );
    expect(
      screen.getByRole("button", { name: /copy dns record type/i }),
    ).toHaveTextContent(/copied/i);

    // Container ships a fresh reveal (different value, same row).
    rerender(
      <DomainManagementPanel
        {...pendingRevealProps({
          pendingVerificationValue: {
            domainId: pendingDomain.id,
            verificationValue: "xynes-verify=NEW_VALUE_AFTER_REGENERATE",
          },
        })}
      />,
    );

    // The Type Copy button MUST be back to "Copy" — the new value
    // hasn't been copied yet. Pre-fix this rendered "Copied"
    // because the reveal-change effect cleared the timer but not
    // the `copiedCellKey` state.
    expect(
      screen.getByRole("button", { name: /copy dns record type/i }),
    ).toHaveTextContent(/^copy$/i);
  });
});
