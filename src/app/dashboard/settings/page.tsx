"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { PageHeader, EmptyState } from "@lumia-ui/components";
import { AuthDashboardShell } from "@/components/dashboard";

export default function SettingsDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="settings">
        <div className="flex h-full flex-col gap-8">
          <PageHeader
            title="Settings"
            subtitle="Manage workspace preferences and access controls."
          />

          <div className="flex h-full min-h-[420px] flex-1 items-center justify-center">
            <div className="w-full max-w-2xl rounded-3xl border border-border/40 bg-card/40 p-10">
              <EmptyState
                icon="settings"
                title="Settings coming soon"
                description="We’re working on workspace settings. Check back shortly."
              />
            </div>
          </div>
        </div>
      </AuthDashboardShell>
    </AuthGuard>
  );
}
