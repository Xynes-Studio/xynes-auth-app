"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";

export default function SecurityDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="security">
        <UnderDevelopmentPanel
          title="Security is under development"
          description="Security controls and policies are coming soon."
        />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
