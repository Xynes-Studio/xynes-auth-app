"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import { AuthDashboardShell } from "@/components/dashboard";

export default function BillingDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="billing">
        <UnderDevelopmentPanel
          title="Billing is under development"
          description="Billing insights and invoices are coming soon."
        />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
