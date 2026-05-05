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

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useAuth, useWorkspace } from "@xynes/auth-sdk";
import {
  WorkspaceIntegrationsApiError,
  listWorkspaceApiKeys,
  listWorkspaceDomains,
} from "@/lib/integrations/workspace-integrations-client";
import type {
  WorkspaceApiKey,
  WorkspaceDomain,
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

export function WorkspaceIntegrationsDashboard() {
  const { currentWorkspace } = useWorkspace();
  const { getAccessToken } = useAuth();

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const workspaceId = currentWorkspace?.id ?? "";
  const workspaceSlug = currentWorkspace?.slug ?? null;

  const [domains, setDomains] = useState<WorkspaceDomain[]>([]);
  const [apiKeys, setApiKeys] = useState<WorkspaceApiKey[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadCounter, setReloadCounter] = useState<number>(0);

  // Pin `getAccessToken` to a ref so the load effect does not refetch on
  // every render just because the SDK hands back a fresh function reference.
  // The latest token-fetching function is always read at call time.
  const getAccessTokenRef = useRef(getAccessToken);
  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  }, [getAccessToken]);

  const handleRetry = useCallback(() => {
    setReloadCounter((count) => count + 1);
  }, []);

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
        <Alert variant="danger" title="Couldn’t load integrations">
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
            <CardTitle id="workspace-integrations-domains-heading">
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
            {!isLoading && !loadError && domains.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No verified domains yet. Add one to start publishing from a
                custom domain.
              </p>
            ) : null}
            {/* Per-row rendering and the add-domain form land in
                DomainManagementPanel (Task 3). */}
          </CardContent>
        </Card>

        <Card
          aria-labelledby="workspace-integrations-api-keys-heading"
          role="region"
        >
          <CardHeader>
            <CardTitle id="workspace-integrations-api-keys-heading">
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
            {!isLoading && !loadError && apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No API keys yet. Create one to grant scoped, revocable access to
                this workspace.
              </p>
            ) : null}
            {/* Per-row rendering, create flow with one-time reveal, and
                revoke confirmation land in ApiKeyManagementPanel (Task 4). */}
          </CardContent>
        </Card>
      </Flex>
    </div>
  );
}
