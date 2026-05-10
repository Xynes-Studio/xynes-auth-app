"use client";

import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  DashboardShell,
  type DashboardNavItem as LumiaDashboardNavItem,
  type DashboardShellLabels,
} from "@lumia-ui/layout";
import { useAuth, useWorkspace, type Workspace } from "@xynes/auth-sdk";
import {
  DASHBOARD_NAV_SPECS,
  type AuthDashboardNavKey,
  type AuthDashboardNavMessageKey,
} from "@/components/dashboard/navigation";
import type { WorkspaceSwitcherProps } from "@/components/workspace/WorkspaceSwitcher";

interface AuthDashboardShellProps {
  children: ReactNode;
  activeNav: AuthDashboardNavKey;
  profileSubtitle?: string;
  workspaceSwitcherProps?: WorkspaceSwitcherProps;
}

type LumiaDashboardChildren = ComponentProps<typeof DashboardShell>["children"];

export function AuthDashboardShell({
  children,
  activeNav,
  profileSubtitle,
  workspaceSwitcherProps,
}: AuthDashboardShellProps) {
  const router = useRouter();
  const activePath = usePathname();
  const { user, workspaces } = useAuth();
  const { currentWorkspace, selectWorkspace } = useWorkspace();
  const tNav = useTranslations("auth.dashboard.navigation");
  const tShellNav = useTranslations("auth.dashboard.shell.navigation");
  const tShellWorkspace = useTranslations("auth.dashboard.shell.workspace");
  const tShellProfile = useTranslations("auth.dashboard.shell.profile");
  const tShellNotifications = useTranslations(
    "auth.dashboard.shell.notifications",
  );
  const tShellUserMenu = useTranslations("auth.dashboard.shell.userMenu");
  const tShell = useTranslations("auth.dashboard.shell");

  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

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
    const selected = workspaceById.get(workspaceId);

    if (!selected) {
      return;
    }

    if (workspaceSwitcherProps?.onWorkspaceSelect) {
      workspaceSwitcherProps.onWorkspaceSelect(selected as Workspace);
      return;
    }

    selectWorkspace(workspaceId);
  };

  const handleCreateWorkspace = () => {
    if (workspaceSwitcherProps?.onCreateNew) {
      workspaceSwitcherProps.onCreateNew();
      return;
    }

    router.push("/onboarding");
  };

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
      onLogout={() => router.push("/logout")}
      notifications={[]}
      sidebarFooterNote={tShell("footerNote")}
      labels={shellLabels}
    >
      {children as unknown as LumiaDashboardChildren}
    </DashboardShell>
  );
}

export type { AuthDashboardNavKey } from "@/components/dashboard/navigation";
