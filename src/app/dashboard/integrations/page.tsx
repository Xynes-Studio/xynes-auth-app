"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { AuthDashboardShell } from "@/components/dashboard";
import { WorkspaceIntegrationsDashboard } from "./components/WorkspaceIntegrationsDashboard";

export default function IntegrationsDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="integrations">
        <WorkspaceIntegrationsDashboard />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
