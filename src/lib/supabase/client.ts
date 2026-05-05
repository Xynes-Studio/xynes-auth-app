import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
      },
    },
  );
}

// OAuth in local dev can fail PKCE when the verifier isn't persisted.
// Use implicit flow for OAuth to avoid PKCE verifier storage issues.
export function createOAuthClient() {
  const authAppUrl = process.env.NEXT_PUBLIC_AUTH_APP_URL ?? "";
  const isLocalDev =
    process.env.NODE_ENV !== "production" ||
    authAppUrl.includes("localhost") ||
    authAppUrl.includes("127.0.0.1");
  const authConfig = isLocalDev
    ? {
        flowType: "implicit" as const,
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      }
    : {
        flowType: "pkce" as const,
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      };

  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: authConfig,
    },
  );
}

// Password recovery links should work even when opened from a different browser/device.
// Using implicit flow avoids requiring a local PKCE code_verifier.
export function createPasswordResetClient() {
  // NOTE: @supabase/ssr's createBrowserClient forces flowType="pkce" internally.
  // For password reset we need implicit flow so the redirect contains tokens and
  // does not depend on a local PKCE code_verifier.
  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    },
  );
}
