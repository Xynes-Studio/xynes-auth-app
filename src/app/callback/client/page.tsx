"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@lumia-ui/components";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { getAllowedRedirectDomains } from "@/lib/redirect";
import {
  clearPersistedOAuthRedirect,
  readPersistedOAuthRedirect,
  resolveOAuthRedirect,
} from "@/lib/redirect/storage";
import { getOAuthErrorMessage } from "@/lib/oauth/errors";
import {
  selectWorkspaceIdForPersistence,
  WORKSPACE_STORAGE_KEY,
} from "@/lib/auth/workspace-default";

const DEFAULT_NEW_USER_REDIRECT = "/onboarding";
const DEFAULT_EXISTING_USER_REDIRECT = "/dashboard/users";
const SUPPORT_EMAIL = "support@xynes.com";

type CallbackState = "loading" | "error";

export default function OAuthClientCallbackPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storedRedirect, setStoredRedirect] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setErrorState = (message: string) => {
      if (typeof window !== "undefined") {
        clearPersistedOAuthRedirect(window.localStorage);
      }
      if (!isMounted) return;
      setErrorMessage(message);
      setState("error");
    };

    async function handleCallback() {
      try {
        const oauthError = searchParams.get("error");
        if (oauthError) {
          setErrorState(getOAuthErrorMessage(oauthError));
          return;
        }

        const supabase = createBrowserClient();
        const redirectParam = searchParams.get("redirect");
        const storedParam =
          typeof window !== "undefined"
            ? readPersistedOAuthRedirect(window.localStorage)
            : null;
        setStoredRedirect(storedParam);
        const code = searchParams.get("code");

        let accessToken: string | undefined;

        if (code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setErrorState(getOAuthErrorMessage("auth_callback_error"));
            return;
          }

          accessToken = data?.session?.access_token;
        } else {
          const hash = window.location.hash.startsWith("#")
            ? window.location.hash.slice(1)
            : window.location.hash;
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token") ?? undefined;
          const refresh_token = params.get("refresh_token") ?? undefined;

          if (!access_token || !refresh_token) {
            setErrorState(getOAuthErrorMessage("auth_callback_error"));
            return;
          }

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            setErrorState(getOAuthErrorMessage("auth_callback_error"));
            return;
          }

          accessToken = data?.session?.access_token ?? access_token;
        }

        if (!accessToken) {
          setErrorState(getOAuthErrorMessage("auth_callback_error"));
          return;
        }
        let hasWorkspaces = false;

        if (process.env.NEXT_PUBLIC_API_URL) {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => {
            controller.abort();
          }, 5000);

          try {
            const response = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/me`,
              {
                method: "GET",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json",
                },
                signal: controller.signal,
              },
            );

            if (response.ok) {
              const payload = await response.json();
              const me = payload?.data ?? payload;
              const availableWorkspaces = Array.isArray(me?.workspaces)
                ? me.workspaces
                : [];

              hasWorkspaces = availableWorkspaces.length > 0;

              if (hasWorkspaces) {
                const storedWorkspaceId =
                  typeof window !== "undefined"
                    ? window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
                    : null;

                const workspaceIdToPersist = selectWorkspaceIdForPersistence({
                  workspaces: availableWorkspaces,
                  storedWorkspaceId,
                });

                if (workspaceIdToPersist && typeof window !== "undefined") {
                  window.localStorage.setItem(
                    WORKSPACE_STORAGE_KEY,
                    workspaceIdToPersist,
                  );
                }
              }
            }
          } catch (err) {
            const isAbortError =
              err instanceof DOMException && err.name === "AbortError";
            if (!isAbortError) {
              console.error("Failed to load workspaces", err);
            }
          } finally {
            window.clearTimeout(timeoutId);
          }
        }

        const defaultRedirect = hasWorkspaces
          ? DEFAULT_EXISTING_USER_REDIRECT
          : DEFAULT_NEW_USER_REDIRECT;

        const allowedDomains = getAllowedRedirectDomains();
        const safeRedirect = resolveOAuthRedirect(
          redirectParam,
          storedParam,
          defaultRedirect,
          allowedDomains,
        );

        if (!isMounted) return;
        if (typeof window !== "undefined") {
          if (window.location.hash) {
            window.history.replaceState(
              null,
              "",
              `${window.location.pathname}${window.location.search}`,
            );
          }
          clearPersistedOAuthRedirect(window.localStorage);
        }
        window.location.href = safeRedirect;
      } catch (err) {
        if (!isMounted) return;
        console.error("OAuth callback failed", err);
        setErrorState(getOAuthErrorMessage("auth_callback_error"));
      }
    }

    void handleCallback();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  const redirectParam = searchParams.get("redirect");
  const allowedDomains = getAllowedRedirectDomains();
  const safeRetryRedirect = resolveOAuthRedirect(
    redirectParam,
    storedRedirect,
    DEFAULT_EXISTING_USER_REDIRECT,
    allowedDomains,
  );
  const retryUrl =
    redirectParam || storedRedirect
      ? `/login?redirect=${encodeURIComponent(safeRetryRedirect)}`
      : "/login";

  return (
    <main
      className="flex min-h-screen items-center justify-center p-4 bg-gray-50"
      role="main"
      aria-busy={state === "loading"}
    >
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-6 text-center">
          {state === "loading" && (
            <>
              <div className="flex justify-center">
                <span
                  className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent"
                  aria-label="Completing sign-in"
                  role="status"
                />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  Completing sign-in…
                </h1>
                <p className="text-sm text-muted-foreground">
                  Please wait while we finish signing you in.
                </p>
              </div>
            </>
          )}

          {state === "error" && (
            <>
              <div
                role="alert"
                className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-left"
              >
                <h2 className="text-sm font-semibold text-destructive">
                  Unable to complete sign-in
                </h2>
                <p className="mt-1 text-sm text-destructive">
                  {errorMessage ?? getOAuthErrorMessage("auth_callback_error")}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                You can retry sign-in or return to login.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => (window.location.href = retryUrl)}
                  type="button"
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 active:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2"
                >
                  Try again
                </Button>
                <Button
                  onClick={() => (window.location.href = "/login")}
                  type="button"
                  variant="outline"
                  className="w-full rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/70 active:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2"
                >
                  Go to login
                </Button>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-sm font-medium text-primary-600 hover:underline"
                >
                  Contact support
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
