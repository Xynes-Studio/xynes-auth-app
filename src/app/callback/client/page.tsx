"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, Button, Alert, Spinner } from "@lumia-ui/components";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { getAllowedRedirectDomains, getSafeRedirectUrl } from "@/lib/redirect";
import { getOAuthErrorMessage } from "@/lib/oauth/errors";

const DEFAULT_NEW_USER_REDIRECT = "/onboarding";
const DEFAULT_EXISTING_USER_REDIRECT = "/workspaces";
const SUPPORT_EMAIL = "support@xynes.com";

type CallbackState = "loading" | "error";

export default function OAuthClientCallbackPage() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setErrorState = (message: string) => {
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
              hasWorkspaces = Array.isArray(me?.workspaces)
                ? me.workspaces.length > 0
                : false;
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
        const safeRedirect = getSafeRedirectUrl(
          redirectParam || "",
          defaultRedirect,
          allowedDomains,
        );

        if (!isMounted) return;
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
  const safeRedirect = getSafeRedirectUrl(
    redirectParam || "",
    DEFAULT_EXISTING_USER_REDIRECT,
    allowedDomains,
  );
  const retryUrl = redirectParam
    ? `/login?redirect=${encodeURIComponent(safeRedirect)}`
    : "/login";

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
                <Spinner size="lg" aria-label="Completing sign-in" />
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
              <div role="alert">
                <Alert
                  variant="error"
                  title="Unable to complete sign-in"
                  description={
                    errorMessage ?? getOAuthErrorMessage("auth_callback_error")
                  }
                  className="text-left"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                You can retry sign-in or return to login.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => (window.location.href = retryUrl)}
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
      </Card>
    </main>
  );
}
