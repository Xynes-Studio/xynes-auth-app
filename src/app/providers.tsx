"use client";

import type { ReactNode } from "react";
import { FeatureFlagsProvider } from "@xynes/auth-sdk";

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Client-side providers wrapper for the auth app.
 * Includes FeatureFlagsProvider for accessing backend feature flags.
 */
export function Providers({ children }: ProvidersProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

  return (
    <FeatureFlagsProvider apiBaseUrl={apiBaseUrl} fetchOnMount={true}>
      {children}
    </FeatureFlagsProvider>
  );
}
