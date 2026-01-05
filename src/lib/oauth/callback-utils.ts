/**
 * OAuth Callback Utilities
 *
 * Pure functions for handling OAuth callback logic.
 * Separated from route handler for testability.
 *
 * @module oauth/callback-utils
 */

import { getSafeRedirectUrl } from "@/lib/redirect";

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
export const DEFAULT_EXISTING_USER_REDIRECT = "/workspaces";

/**
 * Bootstrap response from the accounts service.
 */
export interface BootstrapResponse {
  success: boolean;
  isNewUser: boolean;
  hasWorkspaces: boolean;
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
      return { success: false, isNewUser: true, hasWorkspaces: false };
    }

    const data = await response.json();

    // Check if user has workspaces to determine if they're new
    const hasWorkspaces = Array.isArray(data.workspaces)
      ? data.workspaces.length > 0
      : false;

    return {
      success: true,
      isNewUser: !hasWorkspaces,
      hasWorkspaces,
    };
  } catch (error) {
    // Log error but don't block the flow
    // User can still use the app, bootstrap will happen on next API call
    console.error("Failed to bootstrap user:", error);
    return { success: false, isNewUser: true, hasWorkspaces: false };
  }
}

/**
 * Determines the appropriate redirect URL based on user state.
 *
 * Priority:
 * 1. If redirect param provided and valid, use it
 * 2. If user has no workspaces, go to onboarding
 * 3. Otherwise, go to workspace selector
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
  // Determine default based on user state
  const defaultRedirect = bootstrapResult.hasWorkspaces
    ? DEFAULT_EXISTING_USER_REDIRECT
    : DEFAULT_NEW_USER_REDIRECT;

  // If redirect param provided, validate and use it
  if (redirectParam) {
    return getSafeRedirectUrl(redirectParam, defaultRedirect, allowedDomains);
  }

  return defaultRedirect;
}
