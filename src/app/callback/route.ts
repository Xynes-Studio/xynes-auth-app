import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getSafeRedirectUrl, getAllowedRedirectDomains } from "@/lib/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectParam = searchParams.get("redirect");
  const next = searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = await createServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
