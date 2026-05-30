"use client";

import type { ComponentProps, ReactNode } from "react";
import { Suspense, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
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

export function AuthDashboardShell({
  children,
  activeNav,
  profileSubtitle,
}: AuthDashboardShellProps) {
  const router = useRouter();
  const activePath = usePathname();
  const { user, workspaces } = useAuth();
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
