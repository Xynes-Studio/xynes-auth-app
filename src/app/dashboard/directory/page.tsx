"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";

export default function DirectoryDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="directory">
        <UnderDevelopmentPanel
          title="Directory is under development"
          description="People and team directory experiences are coming soon."
        />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
