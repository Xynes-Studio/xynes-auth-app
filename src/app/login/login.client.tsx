"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
const DEFAULT_REDIRECT = "/dashboard/apps";

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

    const destination = determinePostLoginDestination({
      workspaces: workspaces ?? [],
      redirectParam,
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

    const destination = determinePostLoginDestination({
      workspaces: workspaces ?? [],
      redirectParam,
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
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-left"
        >
          <h2 className="text-sm font-semibold text-destructive">
            Sign-in failed
          </h2>
          <p className="mt-1 text-sm text-destructive">{oauthErrorMessage}</p>
        </div>
      ) : null}
      <LoginForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
    </AuthSplitLayout>
  );
}

export default function LoginClient() {
  return <LoginContent />;
}
