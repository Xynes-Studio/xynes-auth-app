"use client";

/**
 * WorkspaceIntegrationsDashboard
 *
 * Container for the Workspace Admin → Integrations surface. Owns the
 * data-fetching for verified domains and workspace API keys, surfaces the
 * active workspace context, and renders shared loading / error / empty
 * states. Presentational concerns (per-row rendering, add-domain forms,
 * one-time API-key reveal, etc.) live in `DomainManagementPanel` and
 * `ApiKeyManagementPanel` (Tasks 3 + 4 of the workspace-admin-integrations
 * UI plan).
 *
 * Source-of-truth contract: this app is the Workspace Admin app for the
 * Xynes platform. CMS console links into this page as a contextual
 * consumer; the actual lifecycle (create/verify/revoke) lives here.
 *
 * Security:
 * - `getAccessToken` is a Supabase user JWT. We never put workspace API
 *   keys in the browser; raw API keys are surfaced exactly once by the
 *   create-key reveal flow in `ApiKeyManagementPanel` (Task 4).
 * - The integrations gateway client allowlists upstream fields, so server
 *   secrets (`keyHash`, `verificationValueHash`, …) cannot leak through
 *   this container even if the upstream serialises them.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Flex,
  Spinner,
} from "@lumia-ui/components";
import { useSearchParams } from "next/navigation";
import { useAuth, useWorkspace } from "@xynes/auth-sdk";
import {
  WorkspaceIntegrationsApiError,
  createWorkspaceApiKey,
  deleteWorkspaceDomain,
  listWorkspaceApiKeys,
  listWorkspaceDomains,
  registerWorkspaceDomain,
  regenerateWorkspaceDomainVerification,
  revokeWorkspaceApiKey,
  verifyWorkspaceDomain,
} from "@/lib/integrations/workspace-integrations-client";
import type {
  WorkspaceApiKey,
  WorkspaceDomain,
} from "@/lib/integrations/workspace-integrations-types";
import {
  DomainManagementPanel,
  type PendingDomainVerificationValue,
} from "./DomainManagementPanel";
import {
  ApiKeyManagementPanel,
  type ApiKeyManagementPanelCreateInput,
  type PendingWorkspaceRawApiKey,
} from "./ApiKeyManagementPanel";
import {
  WORKSPACE_API_KEY_PRESET_KEYS,
  type WorkspaceApiKeyPresetKey,
} from "@/lib/integrations/workspace-integrations-types";

function getIntegrationsLoadErrorMessage(error: unknown): string {
  if (!(error instanceof WorkspaceIntegrationsApiError)) {
    return "Failed to load workspace integrations.";
  }

  if (error.statusCode === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (error.statusCode === 403) {
    return "You don’t have permission to manage workspace integrations.";
  }

  if (error.statusCode === 429) {
    return "Too many requests. Please try again in a moment.";
  }

  return "Failed to load workspace integrations.";
}

// ── WSA-FIX-1: action-error contract ────────────────────────────────────
//
// `loadError` surfaces FAILURES OF THE LIST REFETCH (initial mount or the
// explicit "Retry" action). Action handlers (register / verify / regenerate
// / delete domain, create / revoke API key) must NOT write to `loadError`,
// because the alert copy "Couldn’t load integrations" wrongly attributes
// the failure to the page load when it was really the action the user just
// took.
//
// Each action surfaces failures through a separate `actionError` state with
// per-action copy ("Couldn’t remove domain", "Couldn’t verify domain", …).
// Successful actions clear `actionError`. A successful action whose
// follow-up refetch fails surfaces a soft "Action succeeded, but we
// couldn’t refresh the list. [Retry]" banner instead of the destructive
// "Couldn’t load integrations" alert (`reloadFailedAfterAction`).
type IntegrationsActionKind =
  | "registerDomain"
  | "verifyDomain"
  | "regenerateVerification"
  | "deleteDomain"
  | "createApiKey"
  | "revokeApiKey";

interface IntegrationsActionError {
  kind: IntegrationsActionKind;
  message: string;
}

const INTEGRATIONS_ACTION_ERROR_TITLES: Record<IntegrationsActionKind, string> =
  {
    registerDomain: "Couldn’t add domain",
    verifyDomain: "Couldn’t verify domain",
    regenerateVerification: "Couldn’t regenerate verification value",
    deleteDomain: "Couldn’t remove domain",
    createApiKey: "Couldn’t create API key",
    revokeApiKey: "Couldn’t revoke API key",
  };

const INTEGRATIONS_ACTION_DEFAULT_MESSAGES: Record<
  IntegrationsActionKind,
  string
> = {
  registerDomain: "We couldn’t add this domain. Please try again.",
  verifyDomain: "We couldn’t verify this domain. Please try again.",
  regenerateVerification:
    "We couldn’t regenerate the verification value. Please try again.",
  deleteDomain: "We couldn’t remove this domain. Please try again.",
  createApiKey: "We couldn’t create this API key. Please try again.",
  revokeApiKey: "We couldn’t revoke this API key. Please try again.",
};

function getIntegrationsActionErrorMessage(
  kind: IntegrationsActionKind,
  error: unknown,
): string {
  if (!(error instanceof WorkspaceIntegrationsApiError)) {
    return INTEGRATIONS_ACTION_DEFAULT_MESSAGES[kind];
  }

  // Status-code → copy mapping mirrors the load path so users see the
  // same explanation for the same auth / rate-limit failure regardless
  // of whether the call was a list or an action.
  if (error.statusCode === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (error.statusCode === 403) {
    return "You don’t have permission to manage workspace integrations.";
  }

  if (error.statusCode === 404) {
    return "We couldn’t find that record. It may have already been removed.";
  }

  if (error.statusCode === 409) {
    return "That conflicts with an existing record. Please review and try again.";
  }

  if (error.statusCode === 422) {
    return "Some of the values you provided aren’t valid. Please review and try again.";
  }

  if (error.statusCode === 429) {
    return "Too many requests. Please try again in a moment.";
  }

  return INTEGRATIONS_ACTION_DEFAULT_MESSAGES[kind];
}

export function WorkspaceIntegrationsDashboard() {
  const { currentWorkspace } = useWorkspace();
  const { getAccessToken } = useAuth();
  const searchParams = useSearchParams();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const workspaceId = currentWorkspace?.id ?? "";
  const workspaceSlug = currentWorkspace?.slug ?? null;

  // ── Deep-link query support (Task 5) ───────────────────────────────────
  // CMS console uses these query parameters to deep-link into Workspace
  // Admin (see `xynes-front-end/xynes-cms-console-web/src/features/integrations/workspace-admin-links.ts`).
  //   - `tab=domains | api-keys` moves keyboard focus to the matching
  //     section heading so SR / keyboard users land on the relevant
  //     surface without scrolling.
  //   - `preset=cms_readonly | cms_publisher` (subset of the full preset
  //     allowlist) pre-selects the create-API-key preset.
  // Unknown values are ignored — no preset preselect, no random focus jump.
  const tabParam = searchParams?.get("tab") ?? null;
  const presetParam = searchParams?.get("preset") ?? null;

  const initialPresetKey = useMemo<WorkspaceApiKeyPresetKey | undefined>(
    () =>
      presetParam &&
      (WORKSPACE_API_KEY_PRESET_KEYS as ReadonlyArray<string>).includes(
        presetParam,
      )
        ? (presetParam as WorkspaceApiKeyPresetKey)
        : undefined,
    [presetParam],
  );

  const domainsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const apiKeysHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
  const [apiKeys, setApiKeys] = useState<WorkspaceApiKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState<number>(0);
  // WSA-FIX-1: actionError holds the most recent ACTION failure (register /
  // verify / regenerate / delete / create-key / revoke-key). It is cleared
  // on the next successful action OR on an explicit dismiss. It is
  // independent of `loadError` so that an action failure never wears the
  // "Couldn’t load integrations" copy and a list refetch failure never
  // wears an action title like "Couldn’t remove domain".
  const [actionError, setActionError] =
    useState<IntegrationsActionError | null>(null);
  // WSA-FIX-1: when an action succeeds but the follow-up list refetch
  // fails (token expiry mid-flight, transient 5xx, network glitch), we
  // surface a softer banner that tells the user the action did succeed
  // but the list is stale. The Retry button reuses `handleRetry` and
  // clears this banner on the next successful refetch.
  const [reloadFailedAfterAction, setReloadFailedAfterAction] =
    useState<boolean>(false);
  // One-time DNS TXT verification value reveal — held in container state
  // and surfaced to the panel as a prop. The raw value is shown exactly
  // once and never persisted beyond this slot.
  const [pendingVerificationValue, setPendingVerificationValue] =
    useState<PendingDomainVerificationValue | null>(null);
  // One-time raw API key reveal — same contract as the DNS value above.
  // Held only in container state, surfaced as a prop, cleared on dismiss.
  const [pendingRawApiKey, setPendingRawApiKey] =
    useState<PendingWorkspaceRawApiKey | null>(null);

  // Cross-workspace leakage guard: if the active workspace changes, drop
  // any DNS TXT verification value left over from the previous workspace.
  // This runs separately from the load effect so the reveal slot is
  // cleared even when `workspaceId` flips to "" (signed-out / unselected).
  useEffect(() => {
    setPendingVerificationValue(null);
    setPendingRawApiKey(null);
  }, [workspaceId]);

  // Pin `getAccessToken` to a ref so the load effect does not refetch on
  // every render just because the SDK hands back a fresh function reference.
  // The latest token-fetching function is always read at call time.
  const getAccessTokenRef = useRef(getAccessToken);
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  const handleRetry = useCallback(() => {
    // Both kinds of refetch failure are cleared on an explicit retry;
    // the reload effect will set `loadError` again if this retry fails.
    setReloadFailedAfterAction(false);
    setReloadCounter((count) => count + 1);
  }, []);

  // WSA-FIX-1: refetch helper used by action handlers after a successful
  // mutation. UNLIKE the load effect, this writes to
  // `reloadFailedAfterAction` (soft banner) on failure — NOT `loadError`
  // (destructive "Couldn’t load integrations" alert). The action itself
  // already succeeded, so we don't want to imply the page is broken.
  const refreshListsAfterAction = useCallback(async () => {
    if (!workspaceId) return;
    const callerGetAccessToken = () => getAccessTokenRef.current();
    try {
      const [nextDomains, nextApiKeys] = await Promise.all([
        listWorkspaceDomains({
          apiBaseUrl,
          workspaceId,
          getAccessToken: callerGetAccessToken,
        }),
        listWorkspaceApiKeys({
          apiBaseUrl,
          workspaceId,
          getAccessToken: callerGetAccessToken,
        }),
      ]);
      setDomains(Array.isArray(nextDomains) ? nextDomains : []);
      setApiKeys(Array.isArray(nextApiKeys) ? nextApiKeys : []);
      // A successful post-action refresh is also a recovery signal for
      // any prior `loadError` left on screen — clearing it here avoids
      // contradictory UI ("Couldn’t load integrations" + fresh data
      // below it). The `loadError` setter is intentionally NOT touched
      // in the catch path: a transient refresh failure does NOT imply
      // the initial load was also broken.
      setLoadError(null);
      setReloadFailedAfterAction(false);
    } catch {
      // Action succeeded. Surface a soft banner; never escalate to the
      // destructive "Couldn’t load integrations" alert. The user retains
      // the previous list state (no clobber).
      setReloadFailedAfterAction(true);
    }
  }, [apiBaseUrl, workspaceId]);

  // Domain mutation handlers — passed to DomainManagementPanel. Each
  // handler refreshes the list on success via `refreshListsAfterAction`
  // (writes to the soft banner state, NOT `loadError`). Action failures
  // surface through `actionError` with per-action copy (WSA-FIX-1).
  const handleRegisterDomain = useCallback(
    async (hostname: string) => {
      if (!workspaceId) return;
      const callerGetAccessToken = () => getAccessTokenRef.current();
      try {
        const result = await registerWorkspaceDomain({
          apiBaseUrl,
          workspaceId,
          getAccessToken: callerGetAccessToken,
          hostname,
        });
        setPendingVerificationValue({
          domainId: result.domain.id,
          verificationValue: result.verificationValue,
        });
        setActionError(null);
        await refreshListsAfterAction();
      } catch (error: unknown) {
        setActionError({
          kind: "registerDomain",
          message: getIntegrationsActionErrorMessage("registerDomain", error),
        });
        throw error;
      }
    },
    [apiBaseUrl, workspaceId, refreshListsAfterAction],
  );

  const handleVerifyDomain = useCallback(
    async (domainId: string) => {
      if (!workspaceId) return;
      const callerGetAccessToken = () => getAccessTokenRef.current();
      try {
        await verifyWorkspaceDomain({
          apiBaseUrl,
          workspaceId,
          getAccessToken: callerGetAccessToken,
          domainId,
        });
        setActionError(null);
        await refreshListsAfterAction();
      } catch (error: unknown) {
        setActionError({
          kind: "verifyDomain",
          message: getIntegrationsActionErrorMessage("verifyDomain", error),
        });
        throw error;
      }
    },
    [apiBaseUrl, workspaceId, refreshListsAfterAction],
  );

  // Regenerate verification token (Phase D recovery path).
  // Behaviour mirrors `handleRegisterDomain`: store the new raw value in
  // the one-time reveal slot so the panel surfaces it, then refresh the
  // row state. Failures surface through `actionError` with per-action
  // copy (WSA-FIX-1) — NOT the "Couldn’t load integrations" alert.
  const handleRegenerateVerification = useCallback(
    async (domainId: string) => {
      if (!workspaceId) return;
      const callerGetAccessToken = () => getAccessTokenRef.current();
      try {
        const result = await regenerateWorkspaceDomainVerification({
          apiBaseUrl,
          workspaceId,
          getAccessToken: callerGetAccessToken,
          domainId,
        });
        setPendingVerificationValue({
          domainId: result.domain.id,
          verificationValue: result.verificationValue,
        });
        setActionError(null);
        await refreshListsAfterAction();
      } catch (error: unknown) {
        setActionError({
          kind: "regenerateVerification",
          message: getIntegrationsActionErrorMessage(
            "regenerateVerification",
            error,
          ),
        });
        throw error;
      }
    },
    [apiBaseUrl, workspaceId, refreshListsAfterAction],
  );

  const handleDeleteDomain = useCallback(
    async (domainId: string) => {
      if (!workspaceId) return;
      const callerGetAccessToken = () => getAccessTokenRef.current();
      try {
        await deleteWorkspaceDomain({
          apiBaseUrl,
          workspaceId,
          getAccessToken: callerGetAccessToken,
          domainId,
        });
        // If the removed domain matches the current reveal, clear it.
        setPendingVerificationValue((previous) =>
          previous && previous.domainId === domainId ? null : previous,
        );
        setActionError(null);
        await refreshListsAfterAction();
      } catch (error: unknown) {
        setActionError({
          kind: "deleteDomain",
          message: getIntegrationsActionErrorMessage("deleteDomain", error),
        });
        throw error;
      }
    },
    [apiBaseUrl, workspaceId, refreshListsAfterAction],
  );

  const handleDismissVerificationValue = useCallback(() => {
    setPendingVerificationValue(null);
  }, []);

  const handleCreateApiKey = useCallback(
    async (input: ApiKeyManagementPanelCreateInput) => {
      if (!workspaceId) return;
      const callerGetAccessToken = () => getAccessTokenRef.current();
      try {
        const result = await createWorkspaceApiKey({
          apiBaseUrl,
          workspaceId,
          getAccessToken: callerGetAccessToken,
          name: input.name,
          presetKey: input.presetKey,
        });
        // Hold the raw key only in container state; the panel renders it
        // exactly once via the `pendingRawKey` prop. Never write it to
        // localStorage, sessionStorage, cookies, or logs.
        setPendingRawApiKey({
          keyId: result.key.id,
          rawKey: result.rawKey,
        });
        setActionError(null);
        await refreshListsAfterAction();
      } catch (error: unknown) {
        setActionError({
          kind: "createApiKey",
          message: getIntegrationsActionErrorMessage("createApiKey", error),
        });
        throw error;
      }
    },
    [apiBaseUrl, workspaceId, refreshListsAfterAction],
  );

  const handleRevokeApiKey = useCallback(
    async (keyId: string) => {
      if (!workspaceId) return;
      const callerGetAccessToken = () => getAccessTokenRef.current();
      try {
        await revokeWorkspaceApiKey({
          apiBaseUrl,
          workspaceId,
          getAccessToken: callerGetAccessToken,
          keyId,
        });
        // If the revoked key matches the current raw-key reveal, clear it.
        setPendingRawApiKey((previous) =>
          previous && previous.keyId === keyId ? null : previous,
        );
        setActionError(null);
        await refreshListsAfterAction();
      } catch (error: unknown) {
        setActionError({
          kind: "revokeApiKey",
          message: getIntegrationsActionErrorMessage("revokeApiKey", error),
        });
        throw error;
      }
    },
    [apiBaseUrl, workspaceId, refreshListsAfterAction],
  );

  const handleDismissRawApiKey = useCallback(() => {
    setPendingRawApiKey(null);
  }, []);

  const handleDismissActionError = useCallback(() => {
    setActionError(null);
  }, []);

  // Move keyboard focus to the deep-linked section heading once the
  // headings are mounted. Runs only when the tab parameter changes so
  // re-renders triggered by data fetches do not steal focus from the user.
  useEffect(() => {
    if (tabParam === "api-keys") {
      apiKeysHeadingRef.current?.focus();
    } else if (tabParam === "domains") {
      domainsHeadingRef.current?.focus();
    }
  }, [tabParam]);

  useEffect(() => {
    if (!workspaceId) {
      setDomains([]);
      setApiKeys([]);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setLoadError(null);

    const callerGetAccessToken = () => getAccessTokenRef.current();

    Promise.all([
      listWorkspaceDomains({
        apiBaseUrl,
        workspaceId,
        getAccessToken: callerGetAccessToken,
        signal: controller.signal,
      }),
      listWorkspaceApiKeys({
        apiBaseUrl,
        workspaceId,
        getAccessToken: callerGetAccessToken,
        signal: controller.signal,
      }),
    ])
      .then(([nextDomains, nextApiKeys]) => {
        if (controller.signal.aborted) return;
        setDomains(Array.isArray(nextDomains) ? nextDomains : []);
        setApiKeys(Array.isArray(nextApiKeys) ? nextApiKeys : []);
        // A successful post-action refresh is also a recovery signal for
        // any prior `loadError` left on screen — clearing it here avoids
        // contradictory UI ("Couldn’t load integrations" + fresh data
        // below it). The `loadError` setter is intentionally NOT touched
        // in the catch path: a transient refresh failure does NOT imply
        // the initial load was also broken.
        setLoadError(null);
        setReloadFailedAfterAction(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setDomains([]);
        setApiKeys([]);
        setLoadError(getIntegrationsLoadErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
    // `getAccessToken` is intentionally excluded — see the ref above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBaseUrl, reloadCounter, workspaceId]);

  if (!workspaceId) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Integrations
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage verified domains and workspace API keys.
          </p>
        </header>
        <Alert variant="warning" title="No workspace selected">
          Select a workspace from the workspace switcher to manage its
          integrations.
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-6">
      <header>
        <h1 className="text-2xl font-semibold text-foreground">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Manage verified domains and workspace API keys for this workspace.
        </p>
        {workspaceSlug ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Active workspace:{" "}
            <span
              data-testid="workspace-integrations-workspace-slug"
              className="font-medium text-foreground"
            >
              {workspaceSlug}
            </span>
          </p>
        ) : null}
      </header>

      {loadError ? (
        <Alert variant="error" title="Couldn’t load integrations">
          <Flex direction="col" gap="sm">
            <span>{loadError}</span>
            <div>
              <Button type="button" onClick={handleRetry} aria-label="Retry">
                Retry
              </Button>
            </div>
          </Flex>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert
          variant="error"
          title={INTEGRATIONS_ACTION_ERROR_TITLES[actionError.kind]}
        >
          <Flex direction="col" gap="sm">
            <span>{actionError.message}</span>
            <div>
              <Button
                type="button"
                onClick={handleDismissActionError}
                aria-label="Dismiss action error"
              >
                Dismiss
              </Button>
            </div>
          </Flex>
        </Alert>
      ) : null}

      {reloadFailedAfterAction && !loadError ? (
        <Alert
          variant="warning"
          title="Couldn’t refresh the list"
          data-testid="workspace-integrations-reload-failed"
        >
          <Flex direction="col" gap="sm">
            <span>
              Action succeeded, but we couldn’t refresh the list. Some rows may
              be out of date until you retry.
            </span>
            <div>
              <Button
                type="button"
                onClick={handleRetry}
                aria-label="Retry refresh"
              >
                Retry
              </Button>
            </div>
          </Flex>
        </Alert>
      ) : null}

      {isLoading && !loadError ? (
        <div
          role="status"
          aria-live="polite"
          data-testid="workspace-integrations-loading"
          className="flex min-h-[160px] items-center justify-center"
        >
          <Spinner />
          <span className="ml-3 text-sm text-muted-foreground">
            Loading workspace integrations…
          </span>
        </div>
      ) : null}

      <Flex direction="col" gap="lg">
        <Card
          aria-labelledby="workspace-integrations-domains-heading"
          role="region"
        >
          <CardHeader>
            <CardTitle
              id="workspace-integrations-domains-heading"
              ref={domainsHeadingRef}
              tabIndex={-1}
            >
              Verified domains
            </CardTitle>
            <CardDescription>
              Domains your workspace owns and can publish content from.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span
              data-testid="workspace-integrations-domains-count"
              className="sr-only"
            >
              {domains.length}
            </span>
            <DomainManagementPanel
              domains={domains}
              isLoading={isLoading}
              onRegisterDomain={handleRegisterDomain}
              onVerifyDomain={handleVerifyDomain}
              onRegenerateVerification={handleRegenerateVerification}
              onDeleteDomain={handleDeleteDomain}
              pendingVerificationValue={pendingVerificationValue}
              onDismissVerificationValue={handleDismissVerificationValue}
            />
          </CardContent>
        </Card>

        <Card
          aria-labelledby="workspace-integrations-api-keys-heading"
          role="region"
        >
          <CardHeader>
            <CardTitle
              id="workspace-integrations-api-keys-heading"
              ref={apiKeysHeadingRef}
              tabIndex={-1}
            >
              Workspace API keys
            </CardTitle>
            <CardDescription>
              Programmatic access scoped to a single workspace. Raw keys are
              shown once on creation and never stored client-side.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <span
              data-testid="workspace-integrations-api-keys-count"
              className="sr-only"
            >
              {apiKeys.length}
            </span>
            <ApiKeyManagementPanel
              apiKeys={apiKeys}
              isLoading={isLoading}
              onCreateApiKey={handleCreateApiKey}
              onRevokeApiKey={handleRevokeApiKey}
              pendingRawKey={pendingRawApiKey}
              onDismissRawKey={handleDismissRawApiKey}
              initialPresetKey={initialPresetKey}
            />
          </CardContent>
        </Card>
      </Flex>
    </div>
  );
}
