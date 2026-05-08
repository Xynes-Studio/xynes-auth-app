"use client";

/**
 * ApiKeyManagementPanel
 *
 * Presentational panel for the Workspace Admin > Integrations > Workspace
 * API keys section. The container (`WorkspaceIntegrationsDashboard`) owns
 * data-fetching; this panel renders the list, the create-key form, and
 * surfaces the one-time raw key reveal.
 *
 * Security:
 * - Never renders fields whose name ends in `Hash`. The Task 1 client
 *   already strips them via DTO normalisation; this panel only reads
 *   allowlisted fields from `WorkspaceApiKey`.
 * - The raw API key is supplied transiently as a prop from the container's
 *   local state; the panel does NOT persist it (no `localStorage`, no
 *   module-level state, no copy into `useState`). When `pendingRawKey` is
 *   `null`, the reveal is unmounted entirely so the raw key is removed
 *   from the DOM.
 * - The raw key string is rendered exactly once — only inside the reveal
 *   block. Nothing else in the panel reads `pendingRawKey.rawKey`.
 *
 * Accessibility:
 * - Per-row action buttons carry `aria-label` strings that include the key
 *   name so screen-reader users know which key they're acting on.
 * - The one-time reveal lives in a `role="status"` region with
 *   `aria-live="polite"` so SR users hear the new instructions.
 * - The destructive revoke action goes through `ConfirmDialog`, which
 *   provides a real focus-trapped accessible dialog from Lumia DS.
 */

import { useCallback, useState, type FormEvent } from "react";
import {
  Button,
  ConfirmDialog,
  Flex,
  InlineAlert,
  Input,
  Select,
  StatusPill,
  useConfirmDialog,
} from "@lumia-ui/components";

import {
  WORKSPACE_API_KEY_PRESET_KEYS,
  type WorkspaceApiKey,
  type WorkspaceApiKeyPresetKey,
  type WorkspaceApiKeyStatus,
} from "@/lib/integrations/workspace-integrations-types";

export interface PendingWorkspaceRawApiKey {
  /** ID of the key the raw value belongs to. */
  keyId: string;
  /** Raw `xynes_live_*` key — shown exactly once and never persisted. */
  rawKey: string;
}

export interface ApiKeyManagementPanelCreateInput {
  name: string;
  presetKey: WorkspaceApiKeyPresetKey;
}

export interface ApiKeyManagementPanelProps {
  /** API keys for the active workspace (resolved by the container). */
  apiKeys: WorkspaceApiKey[];
  /** True while the container is reloading the API key list. */
  isLoading: boolean;
  /**
   * Create a new API key. Receives the trimmed name and the validated
   * preset key. The container is responsible for surfacing errors and
   * refreshing the list.
   */
  onCreateApiKey: (input: ApiKeyManagementPanelCreateInput) => Promise<void>;
  /** Revoke an active API key. */
  onRevokeApiKey: (keyId: string) => Promise<void>;
  /**
   * One-time raw key reveal for the most-recently-created key. The server
   * returns this exactly once and stores only its Argon2id hash; the panel
   * shows it for the user to copy and dismiss. Must be `null` when no
   * reveal is active so the raw key is removed from the DOM.
   */
  pendingRawKey: PendingWorkspaceRawApiKey | null;
  /** Clear the one-time raw key reveal. */
  onDismissRawKey: () => void;
}

// Status presentation

type StatusPillVariant = "success" | "warning" | "error" | "info";

function statusVariant(status: WorkspaceApiKeyStatus): StatusPillVariant {
  switch (status) {
    case "active":
      return "success";
    case "expired":
      return "warning";
    case "revoked":
      return "error";
    default:
      return "info";
  }
}

function statusLabel(status: WorkspaceApiKeyStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "expired":
      return "Expired";
    case "revoked":
      return "Revoked";
    default:
      return status;
  }
}

// Preset presentation

const PRESET_LABELS: Record<WorkspaceApiKeyPresetKey, string> = {
  cms_readonly: "CMS Read-only",
  cms_authoring: "CMS Authoring",
  cms_publisher: "CMS Publisher",
  telemetry_read: "Telemetry Read",
  workspace_admin: "Workspace Admin",
};

function presetLabel(presetKey: string | null | undefined): string | null {
  if (!presetKey) return null;
  if ((WORKSPACE_API_KEY_PRESET_KEYS as ReadonlyArray<string>).includes(presetKey)) {
    return PRESET_LABELS[presetKey as WorkspaceApiKeyPresetKey];
  }
  return presetKey;
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const ts = Date.parse(value);
  if (Number.isNaN(ts)) return null;
  return new Date(ts).toLocaleDateString();
}

// Component

export function ApiKeyManagementPanel({
  apiKeys,
  isLoading,
  onCreateApiKey,
  onRevokeApiKey,
  pendingRawKey,
  onDismissRawKey,
}: ApiKeyManagementPanelProps) {
  const [nameInput, setNameInput] = useState<string>("");
  const [presetInput, setPresetInput] =
    useState<WorkspaceApiKeyPresetKey>("cms_readonly");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingActionKeyId, setPendingActionKeyId] = useState<string | null>(
    null,
  );
  const [keyToRevoke, setKeyToRevoke] = useState<WorkspaceApiKey | null>(null);

  const confirmRevoke = useConfirmDialog();

  const handleSubmitCreate = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedName = nameInput.trim();
      if (!trimmedName) {
        setValidationMessage("Enter a name for the API key.");
        return;
      }
      setValidationMessage(null);
      setIsSubmitting(true);
      try {
        await onCreateApiKey({
          name: trimmedName,
          presetKey: presetInput,
        });
        // Clear the form on success — the container will re-fetch the list
        // and surface the raw key via `pendingRawKey`.
        setNameInput("");
      } catch {
        // The container owns user-facing API errors. Preserve the typed
        // values so the user can retry without re-entering them.
      } finally {
        setIsSubmitting(false);
      }
    },
    [nameInput, presetInput, onCreateApiKey],
  );

  const requestRevoke = useCallback(
    (key: WorkspaceApiKey) => {
      setKeyToRevoke(key);
      confirmRevoke.openDialog();
    },
    [confirmRevoke],
  );

  const handleConfirmRevoke = useCallback(async () => {
    if (!keyToRevoke) return;
    setPendingActionKeyId(keyToRevoke.id);
    try {
      await onRevokeApiKey(keyToRevoke.id);
    } catch {
      // The container renders the safe error message.
    } finally {
      setPendingActionKeyId(null);
      setKeyToRevoke(null);
    }
  }, [keyToRevoke, onRevokeApiKey]);

  const isPanelBusy = isLoading || isSubmitting;

  return (
    <Flex direction="col" gap="md">
      {pendingRawKey ? (
        <InlineAlert variant="info">
          <div
            data-testid="api-key-raw-reveal"
            className="flex flex-col gap-2"
            role="status"
            aria-live="polite"
          >
            <p className="text-sm font-medium">
              Copy your new API key now. You won’t see this key again.
            </p>
            <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
              {pendingRawKey.rawKey}
            </code>
            <div>
              <Button
                type="button"
                onClick={onDismissRawKey}
                aria-label="Dismiss API key"
              >
                I’ve copied it
              </Button>
            </div>
          </div>
        </InlineAlert>
      ) : null}

      <form
        onSubmit={handleSubmitCreate}
        aria-label="Create workspace API key"
        className="flex flex-col gap-2"
        noValidate
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <Input
            type="text"
            value={nameInput}
            onChange={(event) => {
              setNameInput(event.target.value);
              if (validationMessage) setValidationMessage(null);
            }}
            placeholder="e.g. Production publisher"
            aria-invalid={validationMessage ? true : undefined}
            aria-describedby={
              validationMessage ? "api-key-name-error" : undefined
            }
            disabled={isPanelBusy}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Preset</span>
          <Select
            value={presetInput}
            onChange={(event) =>
              setPresetInput(event.target.value as WorkspaceApiKeyPresetKey)
            }
            disabled={isPanelBusy}
          >
            {WORKSPACE_API_KEY_PRESET_KEYS.map((presetKey) => (
              <option key={presetKey} value={presetKey}>
                {PRESET_LABELS[presetKey]}
              </option>
            ))}
          </Select>
        </label>
        {validationMessage ? (
          <p
            id="api-key-name-error"
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
            aria-label="Create API key"
          >
            Create API key
          </Button>
        </div>
      </form>

      {apiKeys.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No API keys yet. Create one to grant scoped, revocable access to this
          workspace.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Workspace API keys">
          {apiKeys.map((apiKey) => {
            const isRowPending = pendingActionKeyId === apiKey.id;
            const canRevoke = apiKey.status === "active";
            const presetLabelText = presetLabel(apiKey.presetKey);
            const lastUsedText = formatDate(apiKey.lastUsedAt);
            const expiresText = formatDate(apiKey.expiresAt);
            return (
              <li
                key={apiKey.id}
                data-testid={`api-key-row-${apiKey.id}`}
                className="rounded border border-border p-3"
              >
                <Flex direction="col" gap="sm">
                  <Flex justify="between" align="center" gap="sm">
                    <span className="font-medium">{apiKey.name}</span>
                    <StatusPill variant={statusVariant(apiKey.status)}>
                      {statusLabel(apiKey.status)}
                    </StatusPill>
                  </Flex>

                  <p className="text-xs text-muted-foreground">
                    <span className="sr-only">Key prefix: </span>
                    <code className="font-mono">{apiKey.keyPrefix}</code>
                    {presetLabelText ? (
                      <>
                        {" · "}
                        <span>{presetLabelText}</span>
                      </>
                    ) : null}
                  </p>

                  <Flex direction="col" gap="sm">
                    {lastUsedText ? (
                      <p className="text-xs text-muted-foreground">
                        Last used {lastUsedText}
                      </p>
                    ) : null}
                    {expiresText ? (
                      <p className="text-xs text-muted-foreground">
                        Expires {expiresText}
                      </p>
                    ) : null}
                  </Flex>

                  {canRevoke ? (
                    <Flex gap="sm" wrap="wrap">
                      <Button
                        type="button"
                        onClick={() => requestRevoke(apiKey)}
                        disabled={isLoading || isRowPending}
                        aria-label={`Revoke API key ${apiKey.name}`}
                      >
                        Revoke
                      </Button>
                    </Flex>
                  ) : null}
                </Flex>
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmation dialog for destructive revoke. */}
      <ConfirmDialog
        title="Revoke API key?"
        description={
          keyToRevoke ? (
            <span className="block space-y-1">
              <span className="block">
                <span className="font-medium">{keyToRevoke.name}</span> will
                stop working immediately.
              </span>
              <span className="block">
                You can create a new key any time, but the existing one cannot
                be restored.
              </span>
            </span>
          ) : (
            "This API key will stop working immediately."
          )
        }
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleConfirmRevoke}
        {...confirmRevoke.dialogProps}
      />
    </Flex>
  );
}
