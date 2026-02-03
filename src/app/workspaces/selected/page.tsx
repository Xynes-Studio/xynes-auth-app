"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Button } from "@lumia-ui/components";
import { AuthGuard, useAuth, useWorkspace } from "@xynes/auth-sdk";
import { determinePostLoginDestination } from "@/lib/auth/post-login-destination";
import { getAllowedRedirectDomains } from "@/lib/redirect";

export default function WorkspaceSelectedPage() {
  const router = useRouter();
  const { workspaces, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoading: isWorkspaceLoading } = useWorkspace();

  const selectedWorkspaceName = useMemo(() => {
    const current = currentWorkspace;
    if (current?.name) return current.name;

    // Fallback: if the provider doesn't expose currentWorkspace yet,
    // show the first workspace name as a best-effort display.
    return workspaces[0]?.name ?? null;
  }, [currentWorkspace, workspaces]);

  const isLoading = isAuthLoading || isWorkspaceLoading;

  const continueDestination = useMemo(() => {
    const allowedRedirectDomains = getAllowedRedirectDomains();
    const consoleBaseUrl = process.env.NEXT_PUBLIC_CONSOLE_URL ?? null;
    const selectedSlug = currentWorkspace?.slug ?? workspaces[0]?.slug ?? null;

    return selectedSlug
      ? determinePostLoginDestination({
          workspaces: [{ slug: selectedSlug }],
          redirectParam: null,
          consoleBaseUrl,
          allowedRedirectDomains,
        })
      : "/workspaces";
  }, [currentWorkspace?.slug, workspaces]);

  const handleContinue = useCallback(() => {
    if (
      continueDestination.startsWith("/") &&
      !continueDestination.startsWith("//")
    ) {
      router.push(continueDestination);
    } else {
      window.location.assign(continueDestination);
    }
  }, [router, continueDestination]);

  return (
    <AuthGuard>
      <main className="flex min-h-screen items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md p-8">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Workspace selected
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Finishing setup..."
                : selectedWorkspaceName
                  ? `You selected ${selectedWorkspaceName}.`
                  : "Your workspace is now selected."}
            </p>
            <p className="text-sm text-muted-foreground">
              No redirect destination was provided. You can continue to your
              workspace landing.
            </p>

            <div className="flex flex-col gap-3 pt-2">
              <Button className="w-full" onClick={handleContinue}>
                Continue
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/workspaces")}
              >
                Back to workspaces
              </Button>
            </div>
          </div>
        </Card>
      </main>
    </AuthGuard>
  );
}
