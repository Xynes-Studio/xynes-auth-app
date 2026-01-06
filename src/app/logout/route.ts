/**
 * Logout Route Handler
 *
 * Server-side logout route that:
 * 1. Signs out from Supabase
 * 2. Clears httpOnly authentication cookies
 * 3. Redirects to login page or specified redirect URL
 *
 * Works from any consumer app via redirect to auth app.
 *
 * @see AUTH-FE-1.7 Logout Flow Story
 * @security
 * - httpOnly cookies cleared server-side (not accessible via JS)
 * - Redirect URLs validated against allowed domains
 * - Handles errors gracefully without exposing sensitive info
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  getPostLogoutRedirectUrl,
  getSupabaseCookieNames,
} from "@/lib/logout";
import { getAllowedRedirectDomains } from "@/lib/redirect";

/**
 * Performs the logout operation.
 *
 * @param request - The incoming request
 * @returns NextResponse with redirect to login page
 */
async function performLogout(request: Request): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url);
  const redirectParam = searchParams.get("redirect");

  // Get allowed domains and validate redirect
  const allowedDomains = getAllowedRedirectDomains();
  const safeRedirect = getPostLogoutRedirectUrl(
    redirectParam,
    "/login",
    allowedDomains
  );

  // Build the final redirect URL
  let redirectUrl: string;
  if (safeRedirect.startsWith("http")) {
    redirectUrl = safeRedirect;
  } else {
    redirectUrl = `${origin}${safeRedirect}`;
  }

  // Create Supabase client and sign out
  try {
    const supabase = await createServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    // Log but don't fail - we still want to clear cookies
    console.error("Supabase signOut error:", error);
  }

  // Clear Supabase authentication cookies server-side
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    const cookieNames = allCookies.map((cookie) => cookie.name);
    const supabaseCookies = getSupabaseCookieNames(cookieNames);

    // Delete each Supabase auth cookie
    for (const cookieName of supabaseCookies) {
      try {
        cookieStore.delete(cookieName);
      } catch (cookieError) {
        // Individual cookie deletion failure shouldn't stop the flow
        console.error(`Failed to delete cookie ${cookieName}:`, cookieError);
      }
    }
  } catch (error) {
    // Log but continue - client will be redirected anyway
    console.error("Cookie clearing error:", error);
  }

  // Redirect to login or specified URL
  return NextResponse.redirect(redirectUrl);
}

/**
 * POST handler for logout
 *
 * Preferred method for logout as it:
 * - Allows CSRF protection via tokens
 * - Won't be triggered by prefetching
 *
 * @example
 * fetch('/logout', { method: 'POST' })
 */
export async function POST(request: Request): Promise<NextResponse> {
  return performLogout(request);
}

/**
 * GET handler for logout
 *
 * Supports logout via direct navigation/redirect from consumer apps.
 * Consumer apps can redirect users to:
 * `https://auth.xynes.com/logout?redirect=https://cms.xynes.com`
 *
 * @example
 * window.location.href = 'https://auth.xynes.com/logout?redirect=' + encodeURIComponent(window.location.href)
 */
export async function GET(request: Request): Promise<NextResponse> {
  return performLogout(request);
}
