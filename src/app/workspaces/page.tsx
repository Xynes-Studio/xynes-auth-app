"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useWorkspace, AuthGuard } from "@xynes/auth-sdk";
import { WorkspaceSelector } from "@/components/workspace/WorkspaceSelector";

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const { workspaces, isLoading: isAuthLoading } = useAuth();
  const { selectWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  const handleSelect = useCallback(
    (workspaceId: string) => {
      selectWorkspace(workspaceId);
      // Navigation strategy: The WorkspaceProvider stores the ID in cookie/local.
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (ws) {
        // Sanitize slug (Defense in Depth)
        const safeSlug = ws.slug.replace(/[^a-z0-9-]/g, "");

        // Redirect to the console/dashboard for this workspace
        const consoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL;

        if (consoleUrl) {
          // Ensure no double slashes
          const baseUrl = consoleUrl.replace(/\/$/, "");
          window.location.href = `${baseUrl}/${safeSlug}`;
        } else {
          // Fallback to local route for testing
          router.push(`/dashboard/${safeSlug}`);
        }
      }
    },
    [selectWorkspace, workspaces, router],
  );

  const handleCreateNew = useCallback(() => {
    router.push("/onboarding");
  }, [router]);

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-5xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
              Select a Workspace
            </h1>
            <p className="text-muted-foreground text-lg text-pretty">
              Choose a workspace to continue working.
            </p>
          </div>

          <WorkspaceSelector
            workspaces={workspaces}
            onSelect={handleSelect}
            onCreateNew={handleCreateNew}
            isLoading={isAuthLoading || isWorkspaceLoading}
          />
        </div>
      </div>
    </AuthGuard>
  );
}
