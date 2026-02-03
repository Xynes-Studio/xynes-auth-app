"use client";

import { Suspense, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Alert } from "@lumia-ui/components";
import { LoginForm } from "@/components/LoginForm";
import { AuthPageSkeleton } from "@/components/ui";
import { useAuth } from "@xynes/auth-sdk";
import { getAllowedRedirectDomains, getSafeRedirectUrl } from "@/lib/redirect";
import { getOAuthErrorMessage } from "@/lib/oauth/errors";
import { determinePostLoginDestination } from "@/lib/auth/post-login-destination";

/**
 * Default redirect URL after successful login.
 */
const DEFAULT_REDIRECT = "/workspaces";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: isAuthLoading, workspaces } = useAuth();
  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");

  const allowedDomains = useMemo(() => getAllowedRedirectDomains(), []);

  // Validate redirect URL to prevent open redirect attacks
  const redirectUrl = getSafeRedirectUrl(
    redirectParam || "",
    DEFAULT_REDIRECT,
    allowedDomains,
  );

  const oauthErrorMessage = errorParam
    ? getOAuthErrorMessage(errorParam)
    : null;

  const handleSuccess = useCallback(() => {
    // Redirect to the validated URL after successful login
    window.location.href = redirectUrl;
  }, [redirectUrl]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) return;

    const consoleBaseUrl =
      process.env.NEXT_PUBLIC_CONSOLE_URL ||
      process.env.NEXT_PUBLIC_CMS_CONSOLE_URL ||
      "";

    const destination = determinePostLoginDestination({
      workspaces: workspaces ?? [],
      redirectParam,
      consoleBaseUrl,
      allowedRedirectDomains: allowedDomains,
    });

    if (/^https?:\/\//i.test(destination) || destination.startsWith("//")) {
      window.location.assign(destination);
    } else {
      router.replace(destination);
    }
  }, [
    isAuthenticated,
    isAuthLoading,
    workspaces,
    redirectParam,
    allowedDomains,
    router,
  ]);

  if (isAuthLoading || isAuthenticated) {
    return (
      <AuthPageSkeleton
        title={isAuthenticated ? "Redirecting" : "Loading login"}
        showForm={false}
        showOAuth={false}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md border border-border/70 bg-card p-8 shadow-xl">
        <div className="space-y-6">
          {oauthErrorMessage ? (
            <div role="alert">
              <Alert
                variant="error"
                title="Sign-in failed"
                description={oauthErrorMessage}
                className="text-left"
              />
            </div>
          ) : null}

          <div className="text-center">
            <h1 className="text-balance text-2xl font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-foreground/70 text-pretty">
              Sign in to your account to continue
            </p>
          </div>

          <LoginForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
        </div>
      </Card>
    </div>
  );
}

function LoginLoading() {
  return (
    <AuthPageSkeleton title="Loading login" showForm={true} showOAuth={true} />
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
