import { describe, it, expect } from "vitest";
import { getFeatureFlagOverrides } from "./overrides";

describe("getFeatureFlagOverrides", () => {
  it("returns empty object when no overrides are provided", () => {
    const overrides = getFeatureFlagOverrides({});
    expect(overrides).toEqual({});
  });

  it("parses boolean OAuth env overrides", () => {
    const overrides = getFeatureFlagOverrides({
      NEXT_PUBLIC_ENABLE_OAUTH_GOOGLE: "true",
      NEXT_PUBLIC_ENABLE_OAUTH_GITHUB: "false",
      NEXT_PUBLIC_ENABLE_OAUTH_APPLE: "true",
    });

    expect(overrides).toEqual({
      xynes_auth_oauth_google: true,
      xynes_auth_oauth_github: false,
      xynes_auth_oauth_apple: true,
    });
  });

  it("normalizes JSON overrides into SDK keys", () => {
    const overrides = getFeatureFlagOverrides({
      NEXT_PUBLIC_FEATURE_FLAGS_OVERRIDE: JSON.stringify({
        enableOAuthGitHub: false,
        enablePasswordReset: true,
        xynes_auth_oauth_google: true,
      }),
    });

    expect(overrides).toEqual({
      xynes_auth_oauth_github: false,
      xynes_auth_password_reset: true,
      xynes_auth_oauth_google: true,
    });
  });

  it("prioritizes explicit OAuth env overrides over JSON", () => {
    const overrides = getFeatureFlagOverrides({
      NEXT_PUBLIC_FEATURE_FLAGS_OVERRIDE: JSON.stringify({
        enableOAuthGitHub: true,
      }),
      NEXT_PUBLIC_ENABLE_OAUTH_GITHUB: "false",
    });

    expect(overrides).toEqual({
      xynes_auth_oauth_github: false,
    });
  });
});
