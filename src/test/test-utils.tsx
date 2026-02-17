import { render, type RenderOptions } from "@testing-library/react";
import { FeatureFlagsProvider, type FeatureFlags } from "@xynes/auth-sdk";
import type { ReactElement, ReactNode } from "react";

/**
 * Default mock feature flags for testing
 */
export const mockFeatureFlags: FeatureFlags = {
  xynes_auth_oauth_google: true,
  xynes_auth_oauth_github: true,
  xynes_auth_oauth_apple: false,
  xynes_auth_email_signup: true,
  xynes_auth_password_reset: true,
  xynes_auth_mfa: false,
  xynes_auth_remember_me: true,
  xynes_auth_session_management: false,
  xynes_auth_rate_limit_ui: true,
  xynes_auth_profile_edit: true,
  xynes_auth_dashboard_apps_v1: false,
  xynes_workspace_creation: true,
  xynes_workspace_switching: true,
  xynes_workspace_multiple: true,
  xynes_invite_system: true,
  xynes_invite_revocation: true,
  xynes_maintenance_mode: false,
};

interface TestProviderProps {
  children: ReactNode;
  featureFlags?: Partial<FeatureFlags>;
}

/**
 * Test wrapper with all required providers
 */
export function TestProviders({
  children,
  featureFlags = {},
}: TestProviderProps) {
  const flags = { ...mockFeatureFlags, ...featureFlags };

  return (
    <FeatureFlagsProvider
      apiBaseUrl="http://localhost:4100"
      fetchOnMount={false}
      initialFlags={flags}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {children as any}
    </FeatureFlagsProvider>
  );
}

/**
 * Custom render function that wraps components with providers
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & {
    featureFlags?: Partial<FeatureFlags>;
  }
) {
  const { featureFlags, ...renderOptions } = options || {};

  return render(ui, {
    wrapper: ({ children }) => (
      <TestProviders featureFlags={featureFlags}>{children}</TestProviders>
    ),
    ...renderOptions,
  });
}

// Re-export everything from @testing-library/react
export * from "@testing-library/react";
export { renderWithProviders as render };
