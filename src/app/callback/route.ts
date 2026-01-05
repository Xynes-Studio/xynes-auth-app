import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getAllowedRedirectDomains } from "@/lib/redirect";
import {
  bootstrapUser,
  determineRedirectUrl,
} from "@/lib/oauth/callback-utils";

/**
 * OAuth Callback Route Handler
 *
 * Handles the OAuth callback from providers (Google, GitHub, etc.).
 * This route:
 * 1. Handles OAuth provider errors (error param)
 * 2. Exchanges the auth code for a Supabase session
 * 3. Bootstraps the user in the accounts service
 * 4. Determines the appropriate redirect based on user state
 *
 * @see https://supabase.com/docs/guides/auth/auth-helpers/nextjs
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect");

  // Handle OAuth provider errors (when provider returns error instead of code)
  const errorCode = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  if (errorCode) {
    // Redirect to login page with error information
    const loginUrl = new URL("/login", origin);
    loginUrl.searchParams.set("error", errorCode);
    if (errorDescription) {
      loginUrl.searchParams.set("error_description", errorDescription);
    }
    return NextResponse.redirect(loginUrl.toString());
  }

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      // Bootstrap user in accounts service after successful OAuth
      // This ensures user exists in our backend with workspaces, etc.
      const bootstrapResult = await bootstrapUser(data.session.access_token);

      // Determine redirect based on user's workspace state
      const allowedDomains = getAllowedRedirectDomains();
      const safeRedirect = determineRedirectUrl(
        redirectParam,
        bootstrapResult,
        allowedDomains
      );

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
