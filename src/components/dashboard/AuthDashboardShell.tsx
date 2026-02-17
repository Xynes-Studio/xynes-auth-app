"use client";

import type { ComponentProps, ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DashboardShell,
  type DashboardNavItem as LumiaDashboardNavItem,
} from "@lumia-ui/layout";
import { useAuth, useWorkspace, type Workspace } from "@xynes/auth-sdk";
import {
  DASHBOARD_NAV_ITEMS,
  type AuthDashboardNavKey,
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

  const workspaceById = new Map(workspaces.map((workspace) => [workspace.id, workspace]));

  const navItems: LumiaDashboardNavItem[] = DASHBOARD_NAV_ITEMS.map((item) => ({
    id: item.key,
    label: item.label,
    href: item.href,
    icon: item.icon,
  }));
  const fallbackActivePath =
    DASHBOARD_NAV_ITEMS.find((item) => item.key === activeNav)?.href ||
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
      userMenu={{
        name: user?.displayName || user?.email || "User",
        email: profileSubtitle || user?.email || "No email",
        avatarSrc: user?.avatarUrl || undefined,
      }}
      onLogout={() => router.push("/logout")}
      notifications={[]}
      sidebarFooterNote="Need access? Contact your workspace owner."
    >
      {children as unknown as LumiaDashboardChildren}
    </DashboardShell>
  );
}

export type { AuthDashboardNavKey } from "@/components/dashboard/navigation";
