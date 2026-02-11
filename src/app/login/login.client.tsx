"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert } from "@lumia-ui/components";
import { LoginForm } from "@/components/auth/forms/LoginForm";
import { AuthSplitLayout } from "@/components/auth/layout/AuthSplitLayout";
import { AuthRouteSwitch } from "@/components/auth/navigation/AuthRouteSwitch";
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
  const [postLoginPending, setPostLoginPending] = useState(false);

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
    if (!redirectParam && (workspaces ?? []).length === 0) {
      setPostLoginPending(true);
      return;
    }

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
  }, [allowedDomains, redirectParam, router, workspaces]);

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
      setPostLoginPending(false);
      window.location.assign(destination);
    } else {
      setPostLoginPending(false);
      router.replace(destination);
    }
  }, [
    isAuthenticated,
    isAuthLoading,
    workspaces,
    redirectParam,
    allowedDomains,
    router,
    postLoginPending,
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
    <AuthSplitLayout>
      <AuthRouteSwitch />
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
      <LoginForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
    </AuthSplitLayout>
  );
}

function LoginLoading() {
  return (
    <AuthPageSkeleton title="Loading login" showForm={true} showOAuth={true} />
  );
}

export default function LoginClient() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
