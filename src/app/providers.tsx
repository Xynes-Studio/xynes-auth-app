"use client";

import { FeatureFlagsProvider } from "@xynes/auth-sdk";

/**
 * Client-side providers wrapper for the auth app.
 * Includes FeatureFlagsProvider for accessing backend feature flags.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

  return (
    <FeatureFlagsProvider apiBaseUrl={apiBaseUrl} fetchOnMount={true}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {children as any}
    </FeatureFlagsProvider>
  );
}
