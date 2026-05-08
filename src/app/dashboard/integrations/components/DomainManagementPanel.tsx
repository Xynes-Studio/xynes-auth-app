"use client";

/**
 * DomainManagementPanel
 *
 * Presentational panel for the Workspace Admin > Integrations > Verified
 * domains section. The container (`WorkspaceIntegrationsDashboard`) owns
 * data-fetching; this panel renders the list, the add-domain form, and
 * surfaces the one-time DNS TXT verification value reveal.
 *
 * Security:
 * - Never renders fields whose name ends in `Hash`. The Task 1 client
 *   already strips them via DTO normalisation; this panel only reads
 *   allowlisted fields from `WorkspaceDomain`.
 * - The raw `verificationValue` is supplied transiently as a prop from the
 *   container's local state; the panel does not persist it. `dismiss`
 *   clears the container slot.
 *
 * Accessibility:
 * - Per-row action buttons carry `aria-label` strings that include the
 *   hostname so screen-reader users know which domain they're acting on.
 * - The pending-verification reveal lives in a `role="status"` region with
 *   `aria-live="polite"` so SR users hear the new instructions.
 * - The destructive disable action goes through `ConfirmDialog`, which
 *   provides a real focus-trapped accessible dialog from Lumia DS.
 */

import { useCallback, useState, type FormEvent } from "react";
import {
  Button,
  ConfirmDialog,
  Flex,
  InlineAlert,
  Input,
  StatusPill,
  useConfirmDialog,
} from "@lumia-ui/components";

import type {
  WorkspaceDomain,
  WorkspaceDomainStatus,
} from "@/lib/integrations/workspace-integrations-types";

export interface PendingDomainVerificationValue {
  domainId: string;
  verificationValue: string;
}

export interface DomainManagementPanelProps {
  /** Domains for the active workspace (resolved by the container). */
  domains: WorkspaceDomain[];
  /** True while the container is reloading the domain list. */
  isLoading: boolean;
  /**
   * Register a new domain. Receives the trimmed hostname. The container is
   * responsible for surfacing errors and refreshing the list.
   */
  onRegisterDomain: (hostname: string) => Promise<void>;
  /** Re-run DNS TXT verification for a pending or failed domain. */
  onVerifyDomain: (domainId: string) => Promise<void>;
  /**
   * Issue a fresh DNS TXT verification token for a pending/failed
   * domain. The server stores only the hash, so a recopy of the original
   * one-time reveal is impossible by design — this is the supported
   * recovery path. On success the container surfaces the new raw value
   * via `pendingVerificationValue`.
   */
  onRegenerateVerification: (domainId: string) => Promise<void>;
  /** Soft-disable a domain (server-side soft delete). */
  onDeleteDomain: (domainId: string) => Promise<void>;
  /**
   * One-time DNS TXT value for the most-recently-registered domain. The
   * server returns this exactly once and stores only its hash; the panel
   * shows it for the user to copy and dismiss.
   */
  pendingVerificationValue: PendingDomainVerificationValue | null;
  /** Clear the one-time DNS TXT reveal. */
  onDismissVerificationValue: () => void;
}

// Status presentation

type StatusPillVariant = "success" | "warning" | "error" | "info";

function statusVariant(status: WorkspaceDomainStatus): StatusPillVariant {
  switch (status) {
    case "verified":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "error";
    case "disabled":
    default:
      return "info";
  }
}

function statusLabel(status: WorkspaceDomainStatus): string {
  switch (status) {
    case "verified":
      return "Verified";
    case "pending":
      return "Pending";
    case "failed":
      return "Failed";
    case "disabled":
      return "Disabled";
    default:
      return status;
  }
}

// Status-aware copy for the destructive action.
//
// The backend `platform.domains.delete` is a soft-delete (status flip to
// 'disabled') regardless of the prior status, so we don't need separate
// actions — but the UI copy MUST match what the user actually intends:
//
//   - pending  → "Cancel"  (the user is abandoning a verification attempt
//                 they never finished; "Disable" implies live behaviour)
//   - failed   → "Remove"  (the attempt finished and failed; the row has
//                 never accepted any traffic; nothing to "disable")
//   - verified → "Disable" (the only state where the row is actually live)
//   - disabled → already inert; the panel never renders the destructive
//                 button for this status.
//
// The same status drives the ConfirmDialog title + description so the
// confirmation conversation matches what the button promised.
type DestructiveCopy = {
  buttonLabel: string;
  ariaLabelPrefix: string;
  dialogTitle: string;
  dialogPrimary: string;
  dialogSecondary: string;
  confirmLabel: string;
};

function destructiveCopy(status: WorkspaceDomainStatus): DestructiveCopy {
  switch (status) {
    case "pending":
      return {
        buttonLabel: "Cancel",
        ariaLabelPrefix: "Cancel domain verification for",
        dialogTitle: "Cancel domain verification?",
        dialogPrimary: "will stop being tracked. You can re-add it any time.",
        dialogSecondary: "No traffic was ever accepted from this domain.",
        confirmLabel: "Cancel verification",
      };
    case "failed":
      return {
        buttonLabel: "Remove",
        ariaLabelPrefix: "Remove failed domain",
        dialogTitle: "Remove failed domain?",
        dialogPrimary:
          "will be removed from this workspace. You can re-add it any time.",
        dialogSecondary: "No traffic was ever accepted from this domain.",
        confirmLabel: "Remove",
      };
    case "verified":
    default:
      return {
        buttonLabel: "Disable",
        ariaLabelPrefix: "Disable domain",
        dialogTitle: "Disable domain?",
        dialogPrimary: "will stop accepting traffic from this workspace.",
        dialogSecondary: "You can re-add it later if needed.",
        confirmLabel: "Disable",
      };
  }
}

// 3-step diagnostic strip — Phase B+D.
//
// Read the categorized `failureCode` from the verify handler and the
// count-only `dnsRecordsFound` and project them into a small
// presentational shape. The strip never renders raw TXT record values —
// the count is sufficient to drive the "value match" question.
//
// Steps:
//   1. DNS lookup    — ✓ when `failureCode` is null OR is a non-DNS-error
//                       category (NO_RECORDS / MISMATCH); ✗ on
//                       NXDOMAIN / TIMEOUT / DNS_ERROR.
//   2. TXT records   — neutral until DNS step passed; "0 records" ✗ on
//                       NO_RECORDS; "N records" ✓ when ≥1.
//   3. Value match   — neutral until both steps passed; ✓ when status
//                       === 'verified'; ✗ on MISMATCH.
type DiagnosticStepStatus = "pass" | "fail" | "skipped";

interface DiagnosticStep {
  /** Stable label for screen readers + visible text. */
  label: string;
  /** Visible secondary detail (e.g. record count). */
  detail: string;
  /** Visual status. */
  status: DiagnosticStepStatus;
}

function isDnsLookupFailure(
  failureCode: string | null | undefined,
): failureCode is "NXDOMAIN" | "TIMEOUT" | "DNS_ERROR" {
  return (
    failureCode === "NXDOMAIN" ||
    failureCode === "TIMEOUT" ||
    failureCode === "DNS_ERROR"
  );
}

function buildDiagnosticStrip(
  domain: WorkspaceDomain,
): DiagnosticStep[] | null {
  // Only render diagnostics on a failed row OR a verified row. Pending
  // rows haven't been verified yet, so there's nothing to diagnose; the
  // verify-now button is the right CTA there.
  if (domain.status !== "failed" && domain.status !== "verified") {
    return null;
  }

  // `failureCode` is already narrowed to `WorkspaceDomainFailureCode | null`
  // by the type system; the client's `asDomainFailureCode` allowlist
  // guarantees only known codes ever reach this function.
  const code = domain.failureCode ?? null;
  const recordCount = domain.dnsRecordsFound ?? null;

  // Step 1: DNS lookup
  const dnsFailed = isDnsLookupFailure(code);
  const lookupStep: DiagnosticStep = dnsFailed
    ? {
        label: "DNS lookup",
        detail:
          code === "NXDOMAIN"
            ? "No record found"
            : code === "TIMEOUT"
              ? "Timed out"
              : "Failed",
        status: "fail",
      }
    : {
        label: "DNS lookup",
        detail: "Resolved",
        status: "pass",
      };

  // Step 2: TXT records found
  let recordsStep: DiagnosticStep;
  if (dnsFailed) {
    recordsStep = {
      label: "TXT records",
      detail: "—",
      status: "skipped",
    };
  } else if (code === "NO_RECORDS" || recordCount === 0) {
    recordsStep = {
      label: "TXT records",
      detail: "0 found",
      status: "fail",
    };
  } else if (typeof recordCount === "number" && recordCount > 0) {
    recordsStep = {
      label: "TXT records",
      detail: `${recordCount} found`,
      status: "pass",
    };
  } else if (domain.status === "verified") {
    // Verified path with no count carried (older row pre-Phase-B).
    // Trust the verified status — the row was confirmed at some point.
    recordsStep = {
      label: "TXT records",
      detail: "Found",
      status: "pass",
    };
  } else {
    // Non-verified row with missing/untrustworthy count. Don't draw a
    // green check from a fallback — show "skipped" so the user (and
    // SR users) can see the diagnostic is incomplete rather than
    // misleadingly healthy.
    recordsStep = {
      label: "TXT records",
      detail: "—",
      status: "skipped",
    };
  }

  // Step 3: Value match
  let matchStep: DiagnosticStep;
  if (domain.status === "verified") {
    matchStep = {
      label: "Value match",
      detail: "Matched",
      status: "pass",
    };
  } else if (code === "MISMATCH") {
    matchStep = {
      label: "Value match",
      detail: "No record matched",
      status: "fail",
    };
  } else {
    matchStep = {
      label: "Value match",
      detail: "—",
      status: "skipped",
    };
  }

  return [lookupStep, recordsStep, matchStep];
}

// Component

export function DomainManagementPanel({
  domains,
  isLoading,
  onRegisterDomain,
  onVerifyDomain,
  onRegenerateVerification,
  onDeleteDomain,
  pendingVerificationValue,
  onDismissVerificationValue,
}: DomainManagementPanelProps) {
  const [hostnameInput, setHostnameInput] = useState<string>("");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [isSubmittingHostname, setIsSubmittingHostname] =
    useState<boolean>(false);
  const [pendingActionDomainId, setPendingActionDomainId] = useState<
    string | null
  >(null);
  const [domainToDelete, setDomainToDelete] = useState<WorkspaceDomain | null>(
    null,
  );

  const confirmDelete = useConfirmDialog();

  const handleSubmitHostname = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = hostnameInput.trim();
      if (!trimmed) {
        setValidationMessage("Enter a domain to add.");
        return;
      }
      setValidationMessage(null);
      setIsSubmittingHostname(true);
      try {
        await onRegisterDomain(trimmed);
        setHostnameInput("");
      } catch {
        // The container owns user-facing API errors. Preserve the typed value
        // so the user can retry without re-entering the hostname.
      } finally {
        setIsSubmittingHostname(false);
      }
    },
    [hostnameInput, onRegisterDomain],
  );

  const handleVerify = useCallback(
    async (domainId: string) => {
      setPendingActionDomainId(domainId);
      try {
        await onVerifyDomain(domainId);
      } catch {
        // The container renders the safe error message.
      } finally {
        setPendingActionDomainId(null);
      }
    },
    [onVerifyDomain],
  );

  const handleRegenerate = useCallback(
    async (domainId: string) => {
      setPendingActionDomainId(domainId);
      try {
        await onRegenerateVerification(domainId);
      } catch {
        // The container renders the safe error message.
      } finally {
        setPendingActionDomainId(null);
      }
    },
    [onRegenerateVerification],
  );

  const handleCopyVerificationValue = useCallback(async () => {
    if (!pendingVerificationValue) return;
    // navigator.clipboard is available in modern browsers (and is the
    // only way to copy programmatically without a permission prompt).
    // We never persist the value beyond this slot — the user copies and
    // then explicitly dismisses the reveal.
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(
          pendingVerificationValue.verificationValue,
        );
      } catch {
        // Some browsers reject clipboard writes when not user-gesture
        // initiated. We silently ignore — the value is still visible in
        // the reveal block for manual copy.
      }
    }
  }, [pendingVerificationValue]);

  const requestDelete = useCallback(
    (domain: WorkspaceDomain) => {
      setDomainToDelete(domain);
      confirmDelete.openDialog();
    },
    [confirmDelete],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!domainToDelete) return;
    setPendingActionDomainId(domainToDelete.id);
    try {
      await onDeleteDomain(domainToDelete.id);
    } catch {
      // The container renders the safe error message.
    } finally {
      setPendingActionDomainId(null);
      setDomainToDelete(null);
    }
  }, [domainToDelete, onDeleteDomain]);

  const isPanelBusy = isLoading || isSubmittingHostname;

  return (
    <Flex direction="col" gap="md">
      {pendingVerificationValue ? (
        <InlineAlert variant="info">
          <div
            data-testid="domain-verification-reveal"
            className="flex flex-col gap-2"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium">
              Add this DNS TXT record to verify your domain. We only show this
              value once.
            </p>
            <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
              {pendingVerificationValue.verificationValue}
            </code>
            <Flex gap="sm" wrap="wrap">
              <Button
                type="button"
                onClick={handleCopyVerificationValue}
                aria-label="Copy verification value"
              >
                Copy
              </Button>
              <Button
                type="button"
                onClick={onDismissVerificationValue}
                aria-label="Dismiss verification value"
              >
                I’ve added it
              </Button>
            </Flex>
          </div>
        </InlineAlert>
      ) : null}

      <form
        onSubmit={handleSubmitHostname}
        aria-label="Add verified domain"
        className="flex flex-col gap-2"
        noValidate
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Domain</span>
          <Input
            type="text"
            value={hostnameInput}
            onChange={(event) => {
              setHostnameInput(event.target.value);
              if (validationMessage) setValidationMessage(null);
            }}
            placeholder="example.com"
            aria-invalid={validationMessage ? true : undefined}
            aria-describedby={
              validationMessage ? "domain-input-error" : undefined
            }
            disabled={isPanelBusy}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {validationMessage ? (
          <p
            id="domain-input-error"
            className="text-sm text-destructive"
            role="alert"
          >
            {validationMessage}
          </p>
        ) : null}
        <div>
          <Button type="submit" disabled={isPanelBusy} aria-label="Add domain">
            Add domain
          </Button>
        </div>
      </form>

      {domains.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No verified domains yet. Add one to start publishing from a custom
          domain.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Verified domains">
          {domains.map((domain) => {
            const isRowPending = pendingActionDomainId === domain.id;
            const showRecheck =
              domain.status === "pending" || domain.status === "failed";
            return (
              <li
                key={domain.id}
                data-testid={`domain-row-${domain.id}`}
                className="rounded border border-border p-3"
              >
                <Flex direction="col" gap="sm">
                  <Flex justify="between" align="center" gap="sm">
                    <span className="font-medium">{domain.hostname}</span>
                    <StatusPill variant={statusVariant(domain.status)}>
                      {statusLabel(domain.status)}
                    </StatusPill>
                  </Flex>

                  {domain.status === "pending" || domain.status === "failed" ? (
                    <div className="text-xs text-muted-foreground">
                      <p>
                        Add a DNS TXT record at{" "}
                        <code className="break-all font-mono">
                          {domain.verificationName}
                        </code>{" "}
                        and recheck.
                      </p>
                    </div>
                  ) : null}

                  {domain.status === "verified" && domain.verifiedAt ? (
                    <p className="text-xs text-muted-foreground">
                      Verified on{" "}
                      {new Date(domain.verifiedAt).toLocaleDateString()}.
                    </p>
                  ) : null}

                  {domain.status === "failed" && domain.failureMessage ? (
                    <p className="text-xs text-destructive">
                      {domain.failureMessage}
                    </p>
                  ) : null}

                  {(() => {
                    // Phase D: 3-step diagnostic strip on failed/verified
                    // rows. Driven by Phase B's `failureCode` +
                    // `dnsRecordsFound`. Never echoes raw TXT record
                    // values back — counts only.
                    const strip = buildDiagnosticStrip(domain);
                    if (!strip) return null;
                    return (
                      <ul
                        data-testid={`domain-diagnostic-strip-${domain.id}`}
                        aria-label={`Verification diagnostic for ${domain.hostname}`}
                        className="flex flex-col gap-1 rounded border border-border bg-muted/40 p-2 text-xs"
                      >
                        {strip.map((step) => {
                          const icon =
                            step.status === "pass"
                              ? "✓"
                              : step.status === "fail"
                                ? "✗"
                                : "·";
                          const colorClass =
                            step.status === "pass"
                              ? "text-emerald-700"
                              : step.status === "fail"
                                ? "text-destructive"
                                : "text-muted-foreground";
                          return (
                            <li
                              key={step.label}
                              data-status={step.status}
                              className="flex items-center gap-2"
                            >
                              <span aria-hidden="true" className={colorClass}>
                                {icon}
                              </span>
                              <span className="font-medium">{step.label}:</span>
                              <span className="text-muted-foreground">
                                {step.detail}
                              </span>
                              <span className="sr-only">{step.status}</span>
                            </li>
                          );
                        })}
                      </ul>
                    );
                  })()}

                  <Flex gap="sm" wrap="wrap">
                    {showRecheck ? (
                      <Button
                        type="button"
                        onClick={() => handleVerify(domain.id)}
                        disabled={isLoading || isRowPending}
                        aria-label={`Recheck verification for ${domain.hostname}`}
                      >
                        Recheck
                      </Button>
                    ) : null}
                    {showRecheck ? (
                      <Button
                        type="button"
                        onClick={() => handleRegenerate(domain.id)}
                        disabled={isLoading || isRowPending}
                        aria-label={`Get a new verification value for ${domain.hostname}`}
                      >
                        Get new value
                      </Button>
                    ) : null}
                    {/*
                      Destructive CTA: render only for rows that can
                      still be acted on. A `disabled` row is the result
                      of a soft-delete and is already inert — clicking
                      "Disable" again would dispatch another pointless
                      delete to the gateway and confuse the operator.
                    */}
                    {domain.status !== "disabled"
                      ? (() => {
                          const copy = destructiveCopy(domain.status);
                          return (
                            <Button
                              type="button"
                              onClick={() => requestDelete(domain)}
                              disabled={isLoading || isRowPending}
                              aria-label={`${copy.ariaLabelPrefix} ${domain.hostname}`}
                            >
                              {copy.buttonLabel}
                            </Button>
                          );
                        })()
                      : null}
                  </Flex>
                </Flex>
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmation dialog for destructive delete/disable.
          Copy is status-aware: pending → Cancel, failed → Remove,
          verified → Disable. Default to the verified copy when no
          target is selected (the dialog isn't visible in that case). */}
      {(() => {
        const copy = domainToDelete
          ? destructiveCopy(domainToDelete.status)
          : destructiveCopy("verified");
        return (
          <ConfirmDialog
            title={copy.dialogTitle}
            description={
              domainToDelete ? (
                <span className="block space-y-1">
                  <span className="block">
                    <span className="font-medium">
                      {domainToDelete.hostname}
                    </span>{" "}
                    {copy.dialogPrimary}
                  </span>
                  <span className="block">{copy.dialogSecondary}</span>
                </span>
              ) : (
                copy.dialogPrimary
              )
            }
            confirmLabel={copy.confirmLabel}
            cancelLabel="Cancel"
            destructive
            onConfirm={handleConfirmDelete}
            {...confirmDelete.dialogProps}
          />
        );
      })()}
    </Flex>
  );
}
