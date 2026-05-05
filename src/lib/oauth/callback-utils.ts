/**
 * OAuth Callback Utilities
 *
 * Pure functions for handling OAuth callback logic.
 * Separated from route handler for testability.
 *
 * @module oauth/callback-utils
 */

import { determinePostLoginDestination } from "@/lib/auth/post-login-destination";
import { asRecord, unwrapGatewayEnvelope } from "@/lib/http/envelope";

/**
 * API base URL for the accounts service.
 * Used for bootstrapping user after OAuth.
 * 
 * Uses server-only env var (NEXT_API_URL) to avoid bundling into client code.
 * This file is only used in server-side route handlers.
 */
const API_BASE_URL = process.env.NEXT_API_URL || "https://api.xynes.com";

/**
 * Default redirect for new users (no workspaces).
 */
export const DEFAULT_NEW_USER_REDIRECT = "/onboarding";

/**
 * Default redirect for existing users (has workspaces).
 */
export const DEFAULT_EXISTING_USER_REDIRECT = "/dashboard/apps";

/**
 * Bootstrap response from the accounts service.
 */
export interface BootstrapResponse {
  success: boolean;
  isNewUser: boolean;
  hasWorkspaces: boolean;
  requiresProfileCompletion: boolean;
}

/**
 * Bootstraps the user by calling GET /me on the accounts service.
 * This creates or updates the user record in our backend after OAuth.
 *
 * Returns information about the user's workspace status to determine
 * whether to redirect to onboarding (new user) or workspace selector.
 *
 * @param accessToken - The Supabase access token
 * @returns Promise<BootstrapResponse> - Bootstrap result with user state
 */
export async function bootstrapUser(
  accessToken: string
): Promise<BootstrapResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      };
    }

    const payload = unwrapGatewayEnvelope(await response.json());
    const data = asRecord(payload) ?? {};

    // Check if user has workspaces to determine if they're new
    const workspaces = Array.isArray(data.workspaces) ? data.workspaces : [];
    const hasWorkspaces = workspaces.length > 0;
    const user = asRecord(data.user) ?? data;
    const displayName =
      typeof user?.displayName === "string" ? user.displayName : "";
    const requiresProfileCompletion = !displayName.trim();

    return {
      success: true,
      isNewUser: !hasWorkspaces,
      hasWorkspaces,
      requiresProfileCompletion,
    };
  } catch (error) {
    // Log error but don't block the flow
    // User can still use the app, bootstrap will happen on next API call
    console.error("Failed to bootstrap user:", error);
    return {
      success: false,
      isNewUser: true,
      hasWorkspaces: false,
      requiresProfileCompletion: false,
    };
  }
}

/**
 * Determines the appropriate redirect URL based on user state.
 *
 * Priority:
 * 1. If profile is incomplete, force /complete-profile with optional redirect
 * 2. If redirect param provided and valid, use it
 * 3. If user has no workspaces, go to onboarding
 * 4. Otherwise, go to workspace selector
 *
 * @param redirectParam - Optional redirect URL from query params
 * @param bootstrapResult - Result from user bootstrap
 * @param allowedDomains - List of allowed redirect domains
 * @returns The safe redirect URL
 */
export function determineRedirectUrl(
  redirectParam: string | null,
  bootstrapResult: BootstrapResponse,
  allowedDomains: string[]
): string {
  // determinePostLoginDestination only needs workspace presence (array length).
  const workspaces = bootstrapResult.hasWorkspaces
    ? [{ slug: "workspace" }]
    : [];

  return determinePostLoginDestination({
    workspaces,
    redirectParam,
    allowedRedirectDomains: allowedDomains,
    requiresProfileCompletion: bootstrapResult.requiresProfileCompletion,
  });
}
