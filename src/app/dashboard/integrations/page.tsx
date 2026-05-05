"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";

export default function IntegrationsDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="integrations">
        <UnderDevelopmentPanel
          title="Integrations are under development"
          description="Connectors and external integrations are coming soon."
        />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
