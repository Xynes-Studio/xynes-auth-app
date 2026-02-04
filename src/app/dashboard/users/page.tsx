"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { EmptyState, PageHeader } from "@lumia-ui/components";
import { AuthDashboardShell } from "@/components/dashboard";

export default function UsersDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="users">
        <div className="flex h-full flex-col gap-8">
          <PageHeader
            title="Users"
            subtitle="Invite and manage workspace members."
          />

          <div className="flex h-full min-h-[420px] flex-1 items-center justify-center">
            <div className="w-full max-w-2xl rounded-3xl border border-border/40 bg-card/40 p-10">
              <EmptyState
                icon="users"
                title="No members listed yet"
                description="Once you invite teammates, roles and statuses will appear here."
              />
            </div>
          </div>
        </div>
      </AuthDashboardShell>
    </AuthGuard>
  );
}
