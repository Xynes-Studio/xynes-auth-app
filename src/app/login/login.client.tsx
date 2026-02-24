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
const AUTH_LOADING_TIMEOUT_MS = 4000;
const LOGIN_REDIRECT_LOOP_KEY = "xynes_auth_login_redirect_loop";
const LOGIN_REDIRECT_LOOP_WINDOW_MS = 15000;
const LOGIN_REDIRECT_MAX_ATTEMPTS = 2;

type RedirectLoopState = {
  redirectIdentity: string;
  firstAt: number;
  attempts: number;
};

function getRedirectIdentity(redirectParam: string | null): string {
  const value = redirectParam?.trim();
  return value && value.length > 0 ? value : "__default__";
}

function readRedirectLoopState(): RedirectLoopState | null {
  try {
    const raw = window.sessionStorage.getItem(LOGIN_REDIRECT_LOOP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RedirectLoopState;
    if (
      typeof parsed.redirectIdentity !== "string" ||
      typeof parsed.firstAt !== "number" ||
      typeof parsed.attempts !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeRedirectLoopState(value: RedirectLoopState): void {
  try {
    window.sessionStorage.setItem(LOGIN_REDIRECT_LOOP_KEY, JSON.stringify(value));
  } catch {
    // Ignore browser storage failures.
  }
}

function clearRedirectLoopState(): void {
  try {
    window.sessionStorage.removeItem(LOGIN_REDIRECT_LOOP_KEY);
  } catch {
    // Ignore browser storage failures.
  }
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isAuthenticated,
    isLoading: isAuthLoading,
    workspaces,
    user,
  } = useAuth();
  const redirectParam = searchParams.get("redirect");
  const errorParam = searchParams.get("error");
  const [postLoginPending, setPostLoginPending] = useState(false);
  const [authLoadingTimeoutReached, setAuthLoadingTimeoutReached] =
    useState(false);
  const [suppressAuthenticatedRedirect, setSuppressAuthenticatedRedirect] =
    useState(false);

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
  const requiresProfileCompletion = Boolean(
    isAuthenticated && !user?.displayName?.trim(),
  );

  useEffect(() => {
    if (!isAuthLoading || isAuthenticated) {
      setAuthLoadingTimeoutReached(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setAuthLoadingTimeoutReached(true);
    }, AUTH_LOADING_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [isAuthenticated, isAuthLoading]);

  useEffect(() => {
    if (isAuthenticated || isAuthLoading) {
      return;
    }
    setSuppressAuthenticatedRedirect(false);
    if (!redirectParam) {
      clearRedirectLoopState();
    }
  }, [isAuthenticated, isAuthLoading, redirectParam]);

  const handleSuccess = useCallback(() => {
    if (!redirectParam && (workspaces ?? []).length === 0) {
      setPostLoginPending(true);
      return;
    }

    const destination = determinePostLoginDestination({
      workspaces: workspaces ?? [],
      redirectParam,
      allowedRedirectDomains: allowedDomains,
      requiresProfileCompletion,
    });

    if (/^https?:\/\//i.test(destination) || destination.startsWith("//")) {
      window.location.assign(destination);
    } else {
      router.replace(destination);
    }
  }, [
    allowedDomains,
    redirectParam,
    requiresProfileCompletion,
    router,
    workspaces,
  ]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) return;

    const redirectIdentity = getRedirectIdentity(redirectParam);
    const now = Date.now();
    const currentLoopState = readRedirectLoopState();
    const sameRedirect =
      currentLoopState?.redirectIdentity === redirectIdentity &&
      now - currentLoopState.firstAt <= LOGIN_REDIRECT_LOOP_WINDOW_MS;

    if (sameRedirect && (currentLoopState?.attempts ?? 0) >= LOGIN_REDIRECT_MAX_ATTEMPTS) {
      setSuppressAuthenticatedRedirect(true);
      clearRedirectLoopState();
      return;
    }

    writeRedirectLoopState({
      redirectIdentity,
      firstAt: sameRedirect ? (currentLoopState?.firstAt ?? now) : now,
      attempts: sameRedirect ? (currentLoopState?.attempts ?? 0) + 1 : 1,
    });

    const destination = determinePostLoginDestination({
      workspaces: workspaces ?? [],
      redirectParam,
      allowedRedirectDomains: allowedDomains,
      requiresProfileCompletion,
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
    requiresProfileCompletion,
    router,
    postLoginPending,
  ]);

  if (
    (isAuthLoading && !authLoadingTimeoutReached) ||
    (isAuthenticated && !suppressAuthenticatedRedirect)
  ) {
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
