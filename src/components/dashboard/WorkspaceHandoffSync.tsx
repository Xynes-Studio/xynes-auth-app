"use client";

/**
 * WorkspaceHandoffSync (FE-XAPP-BUG-001)
 *
 * Honors a one-shot `?workspace=<slug>` URL parameter emitted by other Xynes
 * apps (today: CMS Console's `buildWorkspaceAdminIntegrationUrl`) so a deep
 * link into the Auth App lands the user on the same workspace they were
 * administering in the originating app.
 *
 * Why this is needed
 * ------------------
 * Workspace identity is NOT shared across app origins. Each app maintains
 * its own `xynes_workspace_id` localStorage entry, scoped to its own origin
 * (auth-app on `:3100`, cms-console-web on `:3000` in dev; different
 * subdomains in production). Without a URL-borne handoff, clicking
 * "Manage in Workspace Admin" from CMS while CMS has Workspace A selected
 * silently lands the user on Workspace B because the Auth App resolves
 * `currentWorkspace` from its own independent localStorage.
 *
 * Security contract
 * -----------------
 * The slug is NOT a permission grant. We resolve it against
 * `useAuth().workspaces` — which is server-authoritative via `/me` — and
 * only call `selectWorkspace` if the user is a member of the slug-resolved
 * workspace. An unknown or non-member slug fails closed: the recipient
 * keeps its prior selection and we emit a `console.warn` for dev
 * visibility. A malicious caller cannot use this to elevate scope; at
 * worst they can re-arrange which of the user's own workspaces is
 * currently selected.
 *
 * Idempotency
 * -----------
 * After applying the handoff we strip the `workspace` query param via
 * `router.replace`. The effect dependency on `searchParams` causes a
 * re-run after the URL change, but the second run is a no-op because the
 * param is gone.
 *
 * Coexistence with WorkspaceProvider auto-select
 * ----------------------------------------------
 * `WorkspaceProvider` auto-selects when (a) there's no persisted
 * selection AND (b) the user has exactly one workspace. Our handoff
 * runs after `workspaces` is populated and will overwrite any
 * subsequently-set selection if the slug matches a different workspace.
 * If the slug does NOT match a workspace we know about (e.g. it
 * references a workspace the user is not a member of), we leave the
 * Provider's selection alone.
 */

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth, useWorkspace } from "@xynes/auth-sdk";

const WORKSPACE_QUERY_PARAM = "workspace";

export function WorkspaceHandoffSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { workspaces, isLoading: authLoading } = useAuth();
  const {
    currentWorkspace,
    isLoading: workspaceLoading,
    selectWorkspace,
  } = useWorkspace();

  // Track the last slug value we processed so we never re-fire for the same
  // value within a single session — even if `searchParams` re-yields the
  // same object reference on a stale render.
  const lastProcessedSlugRef = useRef<string | null>(null);

  useEffect(() => {
    // Wait until auth + workspace state has resolved. Acting before
    // `workspaces` is populated would mis-classify a valid slug as
    // "unknown" and warn for no reason.
    if (authLoading || workspaceLoading) {
      return;
    }

    const rawSlug = searchParams?.get(WORKSPACE_QUERY_PARAM);
    const trimmedSlug = rawSlug?.trim() ?? "";

    if (trimmedSlug === "") {
      return;
    }

    if (lastProcessedSlugRef.current === trimmedSlug) {
      // Already processed this slug in this session — don't keep firing
      // every time `searchParams` changes for unrelated reasons.
      return;
    }
    lastProcessedSlugRef.current = trimmedSlug;

    const normalized = trimmedSlug.toLowerCase();
    const matching = workspaces.find(
      (workspace) => workspace.slug?.trim().toLowerCase() === normalized,
    );

    if (!matching) {
      // Unknown / non-member slug. Fail closed: leave selection and URL
      // alone. Warn for dev visibility so a misconfigured deep link is
      // discoverable without spelunking through localStorage.
      // We DO strip the param so a refresh doesn't keep warning.
      // eslint-disable-next-line no-console
      console.warn(
        `[WorkspaceHandoffSync] Ignoring ?workspace=${trimmedSlug} — not a member of any matching workspace.`,
      );
      stripWorkspaceParam(router, pathname, searchParams);
      return;
    }

    if (matching.id !== currentWorkspace?.id) {
      selectWorkspace(matching.id);
    }

    stripWorkspaceParam(router, pathname, searchParams);
  }, [
    authLoading,
    workspaceLoading,
    workspaces,
    currentWorkspace?.id,
    selectWorkspace,
    searchParams,
    router,
    pathname,
  ]);

  return null;
}

/**
 * Remove the `workspace` query parameter from the current URL via
 * `router.replace`, preserving any other query parameters (e.g. `tab`,
 * `preset`) that the originating app also embedded.
 */
function stripWorkspaceParam(
  router: ReturnType<typeof useRouter>,
  pathname: string | null,
  searchParams: ReturnType<typeof useSearchParams>,
): void {
  if (!pathname || !searchParams) {
    return;
  }
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.delete(WORKSPACE_QUERY_PARAM);
  const query = nextParams.toString();
  const nextUrl = query.length > 0 ? `${pathname}?${query}` : pathname;
  router.replace(nextUrl, { scroll: false });
}
