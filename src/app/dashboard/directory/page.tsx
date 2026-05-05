"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { AuthDashboardShell } from "@/components/dashboard";
import { DirectoryDashboardContent } from "./components/DirectoryDashboardContent";

export default function DirectoryDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="directory">
        <DirectoryDashboardContent />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
