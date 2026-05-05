"use client";

import { AuthGuard, useFeatureFlag } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";
import { AppsDashboardContent } from "./components/AppsDashboardContent";

export default function AppsDashboardPage() {
  const isAppsDashboardEnabled = useFeatureFlag("xynes_auth_dashboard_apps_v1");

  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="apps">
        {isAppsDashboardEnabled ? (
          <AppsDashboardContent />
        ) : (
          <UnderDevelopmentPanel
            title="Apps dashboard is disabled"
            description="Enable feature flag xynes_auth_dashboard_apps_v1 to view Apps."
          />
        )}
      </AuthDashboardShell>
    </AuthGuard>
  );
}
