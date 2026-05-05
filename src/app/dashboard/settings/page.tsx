"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";

export default function SettingsDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="settings">
        <UnderDevelopmentPanel
          title="Settings is under development"
          description="Workspace settings and preferences are coming soon."
        />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
