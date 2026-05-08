"use client";

import { Suspense } from "react";
import { AuthGuard } from "@xynes/auth-sdk";
import { Spinner } from "@lumia-ui/components";
import { AuthDashboardShell } from "@/components/dashboard";
import { WorkspaceIntegrationsDashboard } from "./components/WorkspaceIntegrationsDashboard";

/**
 * `WorkspaceIntegrationsDashboard` calls `useSearchParams()` to honor the
 * deep-link contract documented in
 * `xynes-front-end/xynes-cms-console-web/src/features/integrations/workspace-admin-links.ts`
 * (`tab=domains|api-keys`, `preset=cms_readonly|cms_publisher`). Next.js
 * requires `useSearchParams()` to live inside a `<Suspense>` boundary so
 * static prerender can bail out for the search-params subtree.
 */
export default function IntegrationsDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="integrations">
        <Suspense
          fallback={
            <div
              role="status"
              aria-live="polite"
              className="flex min-h-[160px] items-center justify-center"
            >
              <Spinner />
              <span className="ml-3 text-sm text-muted-foreground">
                Loading workspace integrations…
              </span>
            </div>
          }
        >
          <WorkspaceIntegrationsDashboard />
        </Suspense>
      </AuthDashboardShell>
    </AuthGuard>
  );
}
