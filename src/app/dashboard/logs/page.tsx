"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";

export default function LogsDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="logs">
        <UnderDevelopmentPanel
          title="Logs are under development"
          description="Audit and activity logs are coming soon."
        />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
