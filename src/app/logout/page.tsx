"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Button, Spinner, Alert } from "@lumia-ui/components";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { getAllowedRedirectDomains, getSafeRedirectUrl } from "@/lib/redirect";
import { buildLogoutRedirectUrl } from "@/lib/logout";
import { AuthPageSkeleton } from "@/components/ui";

/**
 * Logout page states
 */
type LogoutState = "loading" | "success" | "error";

/**
 * Default redirect URL after successful logout.
 */
const DEFAULT_REDIRECT = "/login";

/**
 * Delay before redirecting (in ms) to show success message.
 */
const REDIRECT_DELAY = 1500;

interface LogoutContentProps {
  redirectUrl: string;
}

function LogoutContent({ redirectUrl }: LogoutContentProps) {
  const [state, setState] = useState<LogoutState>("loading");
  const [error, setError] = useState<string | null>(null);

  /**
   * Performs the client-side logout
   * This complements the server-side route handler.
   */
  const performLogout = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      const supabase = createBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(
          signOutError.message || "Failed to sign out. Please try again.",
        );
        setState("error");
        return;
      }

      setState("success");

      // Redirect after showing success message
      setTimeout(() => {
        window.location.href = redirectUrl;
      }, REDIRECT_DELAY);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setState("error");
    }
  }, [redirectUrl]);

  // Perform logout on mount
  useEffect(() => {
    performLogout();
  }, [performLogout]);

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4 bg-gray-50"
      role="main"
      aria-busy={state === "loading"}
    >
      <Card className="w-full max-w-md p-8">
        <div className="space-y-6 text-center">
          {state === "loading" && (
            <>
              <div className="flex justify-center">
                <Spinner size="lg" aria-label="Signing out" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Signing out...
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Please wait while we securely sign you out.
                </p>
              </div>
            </>
          )}

          {state === "success" && (
            <>
              <div
                className="flex justify-center"
                role="img"
                aria-label="Success checkmark"
              >
                <svg
                  className="h-16 w-16 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Successfully signed out
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  You have been securely signed out. Redirecting...
                </p>
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <Alert
                variant="error"
                title="Sign out error"
                description={error || "An unexpected error occurred"}
                className="text-left"
              />
              <div>
                <h1 className="text-2xl font-semibold text-foreground">
                  Unable to sign out
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  There was a problem signing you out. Please try again.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={performLogout}
                  variant="default"
                  className="w-full"
                >
                  Try again
                </Button>
                <Button
                  onClick={() => (window.location.href = "/login")}
                  variant="outline"
                  className="w-full"
                >
                  Go to login
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </main>
  );
}

function LogoutContentWrapper() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const allowedDomains = getAllowedRedirectDomains();

  // Validate redirect URL to prevent open redirect attacks.
  // IMPORTANT: This redirect is intended to be a post-login destination.
  // After logout we always send the user to /login (auth app), preserving
  // this destination as the login page's `redirect` query param.
  const postLoginRedirect = getSafeRedirectUrl(
    redirectParam || "",
    "",
    allowedDomains,
  );

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  let finalRedirectUrl = DEFAULT_REDIRECT;

  // In SSR/non-browser environments origin may be empty, and buildLogoutRedirectUrl
  // would throw when constructing a URL. In that case, skip it and use DEFAULT_REDIRECT.
  if (origin) {
    const redirectUrl = buildLogoutRedirectUrl(
      origin,
      postLoginRedirect || undefined,
    );
    finalRedirectUrl = redirectUrl || DEFAULT_REDIRECT;
  }

  return <LogoutContent redirectUrl={finalRedirectUrl} />;
}

function LogoutLoading() {
  return (
    <AuthPageSkeleton title="Signing out" showForm={false} showOAuth={false} />
  );
}

/**
 * Logout Page
 *
 * Client-side logout page that:
 * 1. Signs out from Supabase
 * 2. Shows visual feedback during the process
 * 3. Redirects to login page or specified redirect URL
 *
 * This page complements the server-side route handler for cases
 * where client-side navigation is used.
 *
 * @see AUTH-FE-1.7 Logout Flow Story
 */
export default function LogoutPage() {
  return (
    <Suspense fallback={<LogoutLoading />}>
      <LogoutContentWrapper />
    </Suspense>
  );
}
