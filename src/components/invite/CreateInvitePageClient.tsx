"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { CreateInviteForm } from "@/components/invite/CreateInviteForm";

export function CreateInvitePageClient() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
        <CreateInviteForm />
      </div>
    </AuthGuard>
  );
}
