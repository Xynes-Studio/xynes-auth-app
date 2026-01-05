import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl, getAllowedRedirectDomains } from "@/lib/redirect";

/**
 * API base URL for the accounts service.
 * Used for bootstrapping user after OAuth.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.xynes.com";

/**
 * Bootstraps the user by calling GET /me on the accounts service.
 * This creates or updates the user record in our backend after OAuth.
 *
 * @param accessToken - The Supabase access token
 * @returns Promise<boolean> - True if bootstrap succeeded
 */
async function bootstrapUser(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    // 2xx response means success
    return response.ok;
  } catch (error) {
    // Log error but don't block the flow
    // User can still use the app, bootstrap will happen on next API call
    console.error("Failed to bootstrap user:", error);
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Bootstrap user in accounts service after successful OAuth
      // This ensures user exists in our backend with workspaces, etc.
      await bootstrapUser(data.session.access_token);

      // Get safe redirect URL
      const allowedDomains = getAllowedRedirectDomains();
      const safeRedirect = redirectParam
        ? getSafeRedirectUrl(redirectParam, next, allowedDomains)
        : next;

      // If redirect is external (to another xynes app), use that
      // Otherwise, use internal redirect
      if (safeRedirect.startsWith("http")) {
        return NextResponse.redirect(safeRedirect);
      }

      return NextResponse.redirect(`${origin}${safeRedirect}`);
    }
  }

  // Return to login page with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
