"use client";

import type { ReactNode } from "react";
import {
  AuthProvider,
  FeatureFlagsProvider,
  WorkspaceProvider,
  type AuthConfig,
} from "@xynes/auth-sdk";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper for the auth app.
 * Includes FeatureFlagsProvider for accessing backend feature flags.
 */
export function Providers({ children }: ProvidersProps) {
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

  const authConfig: AuthConfig = {
    supabaseUrl,
    supabaseKey,
    apiBaseUrl,
    authAppUrl,
    allowedRedirectDomains,
  };

  return (
    <FeatureFlagsProvider apiBaseUrl={apiBaseUrl} fetchOnMount={true}>
      <AuthProvider config={authConfig}>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </AuthProvider>
    </FeatureFlagsProvider>
  );
}
