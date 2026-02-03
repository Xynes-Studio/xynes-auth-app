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
  const authAppBaseUrl =
    process.env.NEXT_PUBLIC_AUTH_APP_URL || process.env.AUTH_APP_URL || origin;
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect");

  // Handle OAuth provider errors (when provider returns error instead of code)
  const errorCode = searchParams.get("error");

  if (errorCode) {
    // Redirect to login page with only the error code
    // We use our predefined error messages instead of provider descriptions
    // to prevent potential XSS and ensure consistent UX
    const loginUrl = new URL("/login", authAppBaseUrl);
    loginUrl.searchParams.set("error", errorCode);
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
        allowedDomains,
      );

      // If redirect is external (to another xynes app), use that
      // Otherwise, use internal redirect
      if (safeRedirect.startsWith("http")) {
        return NextResponse.redirect(safeRedirect);
      }

      return NextResponse.redirect(`${authAppBaseUrl}${safeRedirect}`);
    }

    if (error) {
      console.error("OAuth callback exchange failed", {
        error: error.message,
      });

      if (error?.code === "pkce_code_verifier_not_found") {
        const fallbackUrl = new URL("/callback/client", authAppBaseUrl);
        fallbackUrl.searchParams.set("code", code);
        if (redirectParam) {
          fallbackUrl.searchParams.set("redirect", redirectParam);
        }
        return NextResponse.redirect(fallbackUrl.toString());
      }
    } else {
      console.error("OAuth callback missing session data");
    }
  }

  // Return to login page with error
  return NextResponse.redirect(
    `${authAppBaseUrl}/login?error=auth_callback_error`,
  );
}
