"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";

export default function UsersDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="users">
        <UnderDevelopmentPanel
          title="Users is under development"
          description="Users dashboard content is under development."
        />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
