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

// Component

export function DomainManagementPanel({
  domains,
  isLoading,
  onRegisterDomain,
  onVerifyDomain,
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
          >
            <p className="text-sm font-medium">
              Add this DNS TXT record to verify your domain. We only show this
              value once.
            </p>
            <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
              {pendingVerificationValue.verificationValue}
            </code>
            <div>
              <Button
                type="button"
                onClick={onDismissVerificationValue}
                aria-label="Dismiss verification value"
              >
                Copied
              </Button>
            </div>
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
          <Button
            type="submit"
            disabled={isPanelBusy}
            aria-label="Add domain"
          >
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
                    <Button
                      type="button"
                      onClick={() => requestDelete(domain)}
                      disabled={isLoading || isRowPending}
                      aria-label={`Disable domain ${domain.hostname}`}
                    >
                      Disable
                    </Button>
                  </Flex>
                </Flex>
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmation dialog for destructive delete/disable. */}
      <ConfirmDialog
        title="Disable domain?"
        description={
          domainToDelete ? (
            <span className="block space-y-1">
              <span className="block">
                <span className="font-medium">{domainToDelete.hostname}</span>{" "}
                will stop accepting traffic from this workspace.
              </span>
              <span className="block">You can re-add it later if needed.</span>
            </span>
          ) : (
            "This domain will be disabled."
          )
        }
        confirmLabel="Disable"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirmDelete}
        {...confirmDelete.dialogProps}
      />
    </Flex>
  );
}
