import type { FeatureFlags } from "@xynes/auth-sdk";
import { normalizeFeatureFlags } from "@xynes/auth-sdk";

type EnvSource = Record<string, string | undefined>;

const parseBooleanEnv = (value?: string): boolean | undefined => {
  if (value === undefined) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
};

const getObjectFromJson = (value?: string): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch (error) {
    console.warn(
      "[FeatureFlags] Invalid NEXT_PUBLIC_FEATURE_FLAGS_OVERRIDE",
      error,
    );
  }
  return null;
};

export function getFeatureFlagOverrides(
  env: EnvSource = process.env,
): Partial<FeatureFlags> {
  const jsonOverrides = getObjectFromJson(
    env.NEXT_PUBLIC_FEATURE_FLAGS_OVERRIDE,
  );
  const normalizedJsonOverrides = normalizeFeatureFlags(jsonOverrides ?? {});

  const oauthOverrides: Partial<FeatureFlags> = {};
  const googleOverride = parseBooleanEnv(env.NEXT_PUBLIC_ENABLE_OAUTH_GOOGLE);
  const githubOverride = parseBooleanEnv(env.NEXT_PUBLIC_ENABLE_OAUTH_GITHUB);
  const appleOverride = parseBooleanEnv(env.NEXT_PUBLIC_ENABLE_OAUTH_APPLE);

  if (googleOverride !== undefined) {
    oauthOverrides.xynes_auth_oauth_google = googleOverride;
  }
  if (githubOverride !== undefined) {
    oauthOverrides.xynes_auth_oauth_github = githubOverride;
  }
  if (appleOverride !== undefined) {
    oauthOverrides.xynes_auth_oauth_apple = appleOverride;
  }

  return {
    ...normalizedJsonOverrides,
    ...oauthOverrides,
  };
}
