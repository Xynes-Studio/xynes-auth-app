"use client";

import { Suspense, useMemo, type ComponentProps, type ReactNode } from "react";
import {
  FeatureFlagsProvider,
  AuthProvider,
  WorkspaceProvider,
} from "@xynes/auth-sdk";
import { IconSprite } from "@lumia-ui/icons";
import { ToastProvider } from "@lumia-ui/components";
import { NextIntlClientProvider } from "next-intl";
import type { Locale } from "@xynes/i18n";
import { getFeatureFlagOverrides } from "@/lib/feature-flags/overrides";
import { ProfileCompletionGate } from "@/components/auth/guards/ProfileCompletionGate";
import type { AuthMessages } from "@/i18n/config";

interface ProvidersProps {
  children: ReactNode;
  locale: Locale;
  messages: AuthMessages;
}

type WorkspaceProviderChildren = ComponentProps<
  typeof WorkspaceProvider
>["children"];

/**
 * Client-side providers wrapper for the auth app.
 * Includes FeatureFlagsProvider for accessing backend feature flags and
 * NextIntlClientProvider for translation catalogs.
 */
export function Providers({ children, locale, messages }: ProvidersProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:54321";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const authAppUrl =
    process.env.NEXT_PUBLIC_AUTH_APP_URL || "http://localhost:3100";
  const allowedRedirectDomains = (
    process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS ||
    "xynes.com,localhost:3000"
  )
    .split(",")
    .map((domain) => domain.trim())
    .filter(Boolean);
  const flagOverrides = useMemo(() => getFeatureFlagOverrides(), []);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      <FeatureFlagsProvider
        apiBaseUrl={apiBaseUrl}
        fetchOnMount={true}
        flagOverrides={flagOverrides}
      >
        <IconSprite />
        {/*
          ToastProvider wraps AuthProvider so any client component below can
          call useToast() to surface transient feedback. Logout uses this for
          BUG-AUTH-3b (confirmation + redirect feedback); future stories may
          reuse it for invite copy, workspace switch, etc.

          Lifecycle note: the toast is anchored to the Radix portal owned by
          this ToastProvider instance. When the user clicks Logout we fire a
          success toast and then router.push("/logout"); the success toast is
          visible for the brief window between fire and the start of the
          full-page navigation to /logout → /login (typically a few hundred
          ms — enough to communicate "logout fired"). The toast does NOT
          persist into /login because the dashboard ToastProvider unmounts
          along with the rest of the tree on a full reload. /login mounts its
          own (sibling) ToastProvider via the same root layout, but that
          instance starts empty. If product wants persistent post-logout
          feedback, see Task 3 in the PR #65 review for a follow-up banner
          story (deferred per sprint plan §7).
        */}
        <ToastProvider>
          <AuthProvider
            config={{
              supabaseUrl,
              supabaseKey,
              apiBaseUrl,
              authAppUrl,
              allowedRedirectDomains,
            }}
          >
            <Suspense fallback={null}>
              <ProfileCompletionGate>
                <WorkspaceProvider>
                  {children as unknown as WorkspaceProviderChildren}
                </WorkspaceProvider>
              </ProfileCompletionGate>
            </Suspense>
          </AuthProvider>
        </ToastProvider>
      </FeatureFlagsProvider>
    </NextIntlClientProvider>
  );
}
