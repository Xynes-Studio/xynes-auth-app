"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useWorkspace, AuthGuard } from "@xynes/auth-sdk";
import { WorkspaceSelector } from "@/components/workspace/WorkspaceSelector";
import { getAllowedRedirectDomains, getSafeRedirectUrl } from "@/lib/redirect";

export default function WorkspaceSelectorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { workspaces, isLoading: isAuthLoading } = useAuth();
  const { selectWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();
  const [isSelecting, setIsSelecting] = useState(false);
  const selectionInFlightRef = useRef(false);

  const handleSelect = useCallback(
    (workspaceId: string) => {
      if (selectionInFlightRef.current) return;
      selectionInFlightRef.current = true;
      setIsSelecting(true);

      selectWorkspace(workspaceId);
      // Navigation strategy: The WorkspaceProvider stores the ID in cookie/local.
      const ws = workspaces.find((w) => w.id === workspaceId);
      if (ws) {
        // Only redirect externally (e.g., CMS portal) when an explicit redirect is provided.
        const allowedDomains = getAllowedRedirectDomains();
        const redirectParam = searchParams.get("redirect");
        const safeRedirect = getSafeRedirectUrl(
          redirectParam?.trim() ?? "",
          "",
          allowedDomains,
        ).trim();

        if (safeRedirect) {
          // Use a hard navigation for absolute URLs (e.g., CMS portal).
          if (safeRedirect.startsWith("/") && !safeRedirect.startsWith("//")) {
            router.push(safeRedirect);
          } else {
            window.location.assign(safeRedirect);
          }
        } else {
          router.push("/workspaces/selected");
        }
      }
    },
    [selectWorkspace, workspaces, router, searchParams],
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
            isLoading={isAuthLoading || isWorkspaceLoading || isSelecting}
            loadingText={
              isSelecting ? "Selecting workspace..." : "Loading workspaces..."
            }
          />
        </div>
      </div>
    </AuthGuard>
  );
}
