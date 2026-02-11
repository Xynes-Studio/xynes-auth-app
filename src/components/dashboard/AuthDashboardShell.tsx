"use client";

import type { ReactNode } from "react";
import {
  Card,
  CardHeader,
  CardContent,
  SideNavItem,
} from "@lumia-ui/components";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";

export type AuthDashboardNavKey = "users" | "settings";

interface AuthDashboardShellProps {
  children: ReactNode;
  activeNav: AuthDashboardNavKey;
}

export function AuthDashboardShell({
  children,
  activeNav,
}: AuthDashboardShellProps) {
  const settingsNavEnabled =
    process.env.NEXT_PUBLIC_AUTH_DASHBOARD_SETTINGS_ENABLED !== "false";

  return (
    <div className="relative min-h-screen w-full bg-background px-6 py-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-foreground focus:shadow"
      >
        Skip to main content
      </a>
      <div
        className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-64 w-[720px] max-w-full rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative flex min-h-[calc(100vh-3.5rem)] w-full flex-1 flex-col gap-6 lg:flex-row">
        <aside className="w-full lg:w-[22rem] lg:self-stretch">
          <Card className="h-full border-border/60 bg-card/90 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.55)]">
            <div className="flex h-full flex-col">
              <CardHeader className="space-y-4 pb-5 px-5 pt-5 border-b-0">
                <WorkspaceSwitcher
                  size="sm"
                  className="w-full"
                  stayOnCurrentPage
                />
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-6 px-5 pb-6 pt-0">
                <nav aria-label="Workspace navigation" className="space-y-3">
                  <SideNavItem
                    label="Users"
                    href="/dashboard/users"
                    icon="users"
                    active={activeNav === "users"}
                  />
                  {settingsNavEnabled ? (
                    <SideNavItem
                      label="Settings"
                      href="/dashboard/settings"
                      icon="settings"
                      active={activeNav === "settings"}
                    />
                  ) : null}
                </nav>
                <div className="mt-auto pt-6 text-xs text-muted-foreground">
                  Need access? Contact your workspace owner.
                </div>
              </CardContent>
            </div>
          </Card>
        </aside>
        <main
          id="main-content"
          className="min-h-[calc(100vh-4rem)] w-full flex-1 lg:min-h-[calc(100vh-3rem)]"
        >
          <Card className="h-full w-full border-border/70 bg-card/90 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.6)]">
            <CardContent className="h-full p-6 lg:p-10">{children}</CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
