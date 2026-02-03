"use client";

import { useMemo, type ReactNode } from "react";
import { FeatureFlagsProvider } from "@xynes/auth-sdk";
import { getFeatureFlagOverrides } from "@/lib/feature-flags/overrides";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper for the auth app.
 * Includes FeatureFlagsProvider for accessing backend feature flags.
 */
export function Providers({ children }: ProvidersProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";
  const flagOverrides = useMemo(() => getFeatureFlagOverrides(), []);

  return (
    <FeatureFlagsProvider
      apiBaseUrl={apiBaseUrl}
      fetchOnMount={true}
      flagOverrides={flagOverrides}
    >
      {children}
    </FeatureFlagsProvider>
  );
}
