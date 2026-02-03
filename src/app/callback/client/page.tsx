"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@lumia-ui/components";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { getAllowedRedirectDomains, getSafeRedirectUrl } from "@/lib/redirect";

const DEFAULT_NEW_USER_REDIRECT = "/onboarding";
const DEFAULT_EXISTING_USER_REDIRECT = "/workspaces";

export default function OAuthClientCallbackPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        const supabase = createBrowserClient();
        const redirectParam = searchParams.get("redirect");
        const code = searchParams.get("code");

        let accessToken: string | undefined;

        if (code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setError(exchangeError.message);
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
            setError("Missing OAuth session. Please try again.");
            return;
          }

          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            setError(sessionError.message);
            return;
          }

          accessToken = data?.session?.access_token ?? access_token;
        }

        if (!accessToken) {
          setError("Missing OAuth session. Please try again.");
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
        const message = err instanceof Error ? err.message : "Unexpected error";
        setError(message);
      }
    }

    void handleCallback();

    return () => {
      isMounted = false;
    };
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-semibold text-foreground">
            Completing sign-in…
          </h1>
          <p className="text-sm text-muted-foreground">
            Please wait while we finish signing you in.
          </p>
          {error ? (
            <p className="text-sm text-red-600">
              {error}{" "}
              <a className="underline" href="/login">
                Return to login
              </a>
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
