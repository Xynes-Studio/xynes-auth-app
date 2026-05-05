"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";

export default function AccessControlDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="access-control">
        <UnderDevelopmentPanel
          title="Access Control is under development"
          description="Role and permission management is coming soon."
        />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
