"use client";

import type { ComponentProps, ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DashboardShell,
  type DashboardNavItem as LumiaDashboardNavItem,
  type DashboardShellLabels,
} from "@lumia-ui/layout";
import { useToast } from "@lumia-ui/components";
import { useAuth, useWorkspace } from "@xynes/auth-sdk";
import {
  DASHBOARD_NAV_SPECS,
  type AuthDashboardNavKey,
  type AuthDashboardNavMessageKey,
} from "@/components/dashboard/navigation";
import { WorkspaceHandoffSync } from "@/components/dashboard/WorkspaceHandoffSync";

interface AuthDashboardShellProps {
  children: ReactNode;
  activeNav: AuthDashboardNavKey;
  profileSubtitle?: string;
}

type LumiaDashboardChildren = ComponentProps<typeof DashboardShell>["children"];

/**
 * BUG-AUTH-9 (2026-06-01): Build the `/onboarding` target URL for the
 * no-workspace guard. Appends `?redirect=<encoded path>` so the post-create
 * flow honours WSA-FIX-2 semantics and the user lands back on the dashboard
 * route they originally tried to visit.
 *
 * The redirect param value is the path-only portion (`pathname + search`),
 * NOT a fully-qualified URL — `/onboarding` already lives in the same
 * auth-app origin, and downstream redirect-allowlist code treats relative
 * paths as same-origin safe.
 *
 * **Query-string preservation (PR #73 Codex P2 follow-up, 2026-06-01).** The
 * input MUST be `${pathname}${searchString}` so dashboard query parameters
 * survive the round-trip — e.g. `/dashboard/apps?tab=overview` or the
 * FE-XAPP-BUG-001 cross-app handoff URL `/dashboard/apps?workspace=<slug>`.
 * The caller is responsible for combining `usePathname()` + `useSearchParams()`
 * before calling this helper. This mirrors the canonical pattern already
 * used by `ProfileCompletionGate.tsx` so the two redirect surfaces stay
 * behaviourally aligned.
 *
 * If `currentPathWithQuery` is unavailable (initial render before
 * `usePathname` resolves) or is itself `/onboarding` (with or without
 * query), we omit the redirect param to avoid a self-loop.
 */
function buildOnboardingRedirectTarget(
  currentPathWithQuery: string | null,
): string {
  if (!currentPathWithQuery) {
    return "/onboarding";
  }
  // Strip any query string before comparing against the onboarding routes so
  // `/onboarding?foo=bar` still short-circuits the self-loop guard.
  const queryStart = currentPathWithQuery.indexOf("?");
  const pathnameOnly =
    queryStart === -1
      ? currentPathWithQuery
      : currentPathWithQuery.slice(0, queryStart);
  if (
    pathnameOnly === "/onboarding" ||
    pathnameOnly.startsWith("/onboarding/")
  ) {
    return "/onboarding";
  }
  // Defense-in-depth: drop any path that escapes the auth-app origin. The
  // value comes from Next.js `usePathname()` so it is always a same-origin
  // path string, but we keep this guard so a future contract change cannot
  // smuggle an external URL into the redirect param.
  if (
    !currentPathWithQuery.startsWith("/") ||
    currentPathWithQuery.startsWith("//")
  ) {
    return "/onboarding";
  }
  return `/onboarding?redirect=${encodeURIComponent(currentPathWithQuery)}`;
}

export function AuthDashboardShell({
  children,
  activeNav,
  profileSubtitle,
}: AuthDashboardShellProps) {
  const router = useRouter();
  const activePath = usePathname();
  const searchParams = useSearchParams();
  const { user, workspaces, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, selectWorkspace } = useWorkspace();
  const { show: showToast } = useToast();
  const tNav = useTranslations("auth.dashboard.navigation");
  const tShellNav = useTranslations("auth.dashboard.shell.navigation");
  const tShellWorkspace = useTranslations("auth.dashboard.shell.workspace");
  const tShellProfile = useTranslations("auth.dashboard.shell.profile");
  const tShellLogout = useTranslations("auth.dashboard.shell.logout");
  const tShellNotifications = useTranslations(
    "auth.dashboard.shell.notifications",
  );
  const tShellUserMenu = useTranslations("auth.dashboard.shell.userMenu");
  const tShell = useTranslations("auth.dashboard.shell");

  /**
   * BUG-AUTH-9 (2026-06-01): No-workspace guard. When auth bootstrap has
   * resolved AND the user has zero workspaces, redirect to `/onboarding`
   * (preserving the requested dashboard path + query via `?redirect=`).
   * The guard fires once per mount via `router.replace` — `replace` keeps
   * the broken `/dashboard/*` URL out of session history so a back-button
   * click after workspace creation does not land them back here.
   *
   * Why client-side and not a server RSC redirect: every `/dashboard/*`
   * route in this app is a client page wrapping `<AuthGuard><AuthDashboardShell>`,
   * and workspace state is bootstrapped client-side by the SDK's
   * `AuthProvider` (Supabase session + `/me` round-trip). A server-side
   * redirect would require a major rewrite of the auth pipeline. Matches
   * the existing `redirectToLogin` pattern in `CmsDashboardShell` and the
   * shell's own `handleCreateWorkspace` posture.
   *
   * Query-string handling (PR #73 Codex P2 follow-up): we combine
   * `usePathname()` + `useSearchParams()` before encoding so dashboard
   * query params like `?tab=overview` and the FE-XAPP-BUG-001 cross-app
   * handoff URL `?workspace=<slug>` survive the post-create round-trip.
   * Mirrors the canonical pattern in `ProfileCompletionGate.tsx`.
   *
   * The render guard below the effect prevents any flash of the dashboard
   * shell while `router.replace` is in flight.
   */
  const shouldRedirectToOnboarding = !isAuthLoading && workspaces.length === 0;
  const searchString = searchParams?.toString() ?? "";
  const activePathWithQuery = activePath
    ? `${activePath}${searchString ? `?${searchString}` : ""}`
    : null;

  useEffect(() => {
    if (!shouldRedirectToOnboarding) {
      return;
    }
    router.replace(buildOnboardingRedirectTarget(activePathWithQuery));
  }, [activePathWithQuery, router, shouldRedirectToOnboarding]);

  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace]),
  );

  const navItems: LumiaDashboardNavItem[] = useMemo(
    () =>
      DASHBOARD_NAV_SPECS.map((spec) => ({
        id: spec.key,
        label: tNav(spec.messageKey as AuthDashboardNavMessageKey),
        href: spec.href,
        icon: spec.icon,
      })),
    [tNav],
  );

  const fallbackActivePath =
    DASHBOARD_NAV_SPECS.find((spec) => spec.key === activeNav)?.href ||
    "/dashboard/apps";

  const handleWorkspaceSelect = (workspaceId: string) => {
    // Selection always routes through the auth SDK's workspace context — the
    // single canonical path for the Lumia DashboardShell-internal switcher
    // (BUG-LDS-2). Guard against ids that aren't in the current list.
    if (!workspaceById.has(workspaceId)) {
      return;
    }

    selectWorkspace(workspaceId);
  };

  const handleCreateWorkspace = () => {
    router.push("/onboarding");
  };

  /**
   * BUG-AUTH-3b: Show a confirmation toast immediately on logout click, then
   * navigate to the server-side /logout route. The /logout route performs
   * Supabase signOut + cookie clearing + 302 redirect to /login; it is
   * defensive (always redirects, even on signOut failure) so a failure path
   * here only fires if router.push itself throws (extremely rare in Next.js
   * — but we still surface a destructive toast and keep the user on the
   * dashboard so they know nothing happened).
   */
  const handleLogout = useCallback(() => {
    showToast({
      variant: "success",
      title: tShellLogout("successTitle"),
      description: tShellLogout("successDescription"),
    });
    try {
      router.push("/logout");
    } catch (error) {
      console.error("[AuthDashboardShell] logout navigation failed", error);
      showToast({
        variant: "error",
        title: tShellLogout("errorTitle"),
        description: tShellLogout("errorDescription"),
      });
    }
  }, [router, showToast, tShellLogout]);

  // Build the Lumia DashboardShell label bundle from the auth.dashboard
  // catalog. Each branch is a thin map: this is the single seam where Auth
  // Admin owns translated product copy and the design-system stays
  // copy-neutral. Lumia's defaults remain English for backwards-compatible
  // callers that don't pass `labels`.
  const shellLabels: DashboardShellLabels = useMemo(
    () => ({
      navigation: {
        mainContent: tShellNav("mainContent"),
        sidebar: tShellNav("sidebar"),
        sidebarScrollArea: tShellNav("sidebarScrollArea"),
        dashboardNavigation: tShellNav("dashboardNavigation"),
        mobileDashboardNavigation: tShellNav("mobileDashboardNavigation"),
        mobileMenu: tShellNav("mobileMenu"),
        openMobileMenu: tShellNav("openMobileMenu"),
      },
      workspace: {
        trigger: tShellWorkspace("trigger"),
        fallbackName: tShellWorkspace("fallbackName"),
        currentSection: tShellWorkspace("currentSection"),
        currentBadge: tShellWorkspace("currentBadge"),
        switchToSection: tShellWorkspace("switchToSection"),
        createAction: tShellWorkspace("createAction"),
        createUnavailableAction: tShellWorkspace("createUnavailableAction"),
      },
      profile: {
        trigger: tShellProfile("trigger"),
        profileAction: tShellProfile("profileAction"),
        logoutAction: tShellProfile("logoutAction"),
      },
      notifications: {
        open: tShellNotifications("open"),
        tab: tShellNotifications("tab"),
        title: (unreadCount: number) =>
          tShellNotifications("titlePattern", { unreadCount }),
        empty: tShellNotifications("empty"),
        list: tShellNotifications("list"),
        todayGroup: tShellNotifications("todayGroup"),
        yesterdayGroup: tShellNotifications("yesterdayGroup"),
        unreadCount: (unreadCount: number) =>
          tShellNotifications("unreadCountPattern", { unreadCount }),
        delete: (notification) =>
          tShellNotifications("deletePattern", {
            title: notification.title,
          }),
      },
    }),
    [tShellNav, tShellWorkspace, tShellProfile, tShellNotifications],
  );

  /**
   * BUG-AUTH-9 (2026-06-01): Render a minimal loading fallback while either
   * (a) auth bootstrap is still in flight (workspaces array not final), or
   * (b) the no-workspace redirect to `/onboarding` is queued via the effect
   *     above. Prevents a flash of dashboard chrome rendered against a
   *     workspace context that does not exist.
   *
   * `AuthGuard` (upstream) handles the unauthenticated case — if we got
   * here we are authenticated; this branch only fires for the
   * `authenticated && workspaces.length === 0` window.
   *
   * Uses a `role="status"` live region so screen readers announce the
   * transition. The Lumia DS spinner is intentionally NOT pulled in — we
   * keep the markup minimal (the redirect resolves within one tick) and
   * defer to next-intl for translated copy.
   */
  if (shouldRedirectToOnboarding) {
    return (
      <main
        data-testid="auth-dashboard-no-workspace-fallback"
        className="flex min-h-dvh items-center justify-center px-6"
      >
        <div
          role="status"
          aria-live="polite"
          className="flex max-w-md flex-col items-center gap-2 text-center"
        >
          <p className="text-base font-medium text-foreground">
            {tShell("noWorkspaceRedirect.title")}
          </p>
          <p className="text-sm text-muted-foreground">
            {tShell("noWorkspaceRedirect.description")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <DashboardShell
      activePath={activePath || fallbackActivePath}
      navItems={navItems}
      onNavigate={(href) => router.push(href)}
      workspace={
        currentWorkspace
          ? {
              id: currentWorkspace.id,
              name: currentWorkspace.name,
              slug: currentWorkspace.slug,
            }
          : null
      }
      workspaceOptions={workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
      }))}
      onWorkspaceSelect={handleWorkspaceSelect}
      onCreateWorkspace={handleCreateWorkspace}
      enableWorkspaceCreation={true}
      workspaceCreationDisabledMessage={tShell(
        "workspaceCreationDisabledMessage",
      )}
      userMenu={{
        name:
          user?.displayName || user?.email || tShellUserMenu("fallbackName"),
        email:
          profileSubtitle || user?.email || tShellUserMenu("fallbackEmail"),
        avatarSrc: user?.avatarUrl || undefined,
      }}
      onProfileOpen={() => router.push("/profile")}
      onLogout={handleLogout}
      notifications={[]}
      sidebarFooterNote={tShell("footerNote")}
      labels={shellLabels}
    >
      {/*
        FE-XAPP-BUG-001: honor a one-shot `?workspace=<slug>` URL parameter
        emitted by cross-app deep links (e.g. CMS Console → Workspace Admin
        integrations). Mounted at the shell level so every dashboard route
        participates in the handoff contract. Renders nothing.

        Wrapped in <Suspense> because `WorkspaceHandoffSync` calls
        `useSearchParams()`, which Next.js 15 requires to be inside a
        Suspense boundary for static prerender. The Auth App's providers
        layer already provides an ancestor Suspense, but scoping it locally
        here makes the shell self-contained: future dashboard routes don't
        need to know about this constraint, and a future agent who moves
        the providers' Suspense won't accidentally break dashboard builds.
        Fallback is `null` because the component renders nothing anyway.
      */}
      <Suspense fallback={null}>
        <WorkspaceHandoffSync />
      </Suspense>
      {children as unknown as LumiaDashboardChildren}
    </DashboardShell>
  );
}

export type { AuthDashboardNavKey } from "@/components/dashboard/navigation";
