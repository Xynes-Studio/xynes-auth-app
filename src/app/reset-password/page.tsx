"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card } from "@lumia-ui/components";
import { createPasswordResetClient } from "@/lib/supabase/client";
import { ResetPasswordForm } from "@/components/auth/forms/ResetPasswordForm";
import { AuthPageSkeleton } from "@/components/ui";

type DebugAttempt = {
  step: string;
  ok: boolean;
  error?: {
    message?: string;
    status?: number;
    name?: string;
    code?: string;
  };
};

type ResetPasswordDebugInfo = {
  timestamp: string;
  origin: string;
  supabaseUrlHost?: string;
  query: {
    codeLen: number;
    tokenHashLen: number;
    tokenLen: number;
    hasEmail: boolean;
    hasType: boolean;
  };
  hash: {
    accessTokenLen: number;
    refreshTokenLen: number;
    tokenLen: number;
    tokenHashLen: number;
    hasEmail: boolean;
    hasType: boolean;
  };
  attempts: DebugAttempt[];
};

function summarizeAuthError(error: unknown): DebugAttempt["error"] | undefined {
  if (!error || typeof error !== "object") return undefined;

  const maybe = error as Record<string, unknown>;

  return {
    message: typeof maybe.message === "string" ? maybe.message : undefined,
    status: typeof maybe.status === "number" ? maybe.status : undefined,
    name: typeof maybe.name === "string" ? maybe.name : undefined,
    code: typeof maybe.code === "string" ? maybe.code : undefined,
  };
}

function InvalidLink() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Invalid or expired link.</p>
      <div className="flex justify-center">
        <a
          href="/forgot-password"
          className="text-sm font-medium text-primary-600 hover:underline"
        >
          Request a new reset link
        </a>
      </div>
    </div>
  );
}

function DebugPanel({ info }: { info: ResetPasswordDebugInfo }) {
  return (
    <details className="rounded-md border border-border bg-muted/30 p-3">
      <summary className="cursor-pointer select-none text-xs font-medium">
        Reset-password debug (safe)
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Token values are not displayed—only presence and length.
      </p>
      <pre className="mt-2 max-h-64 overflow-auto rounded bg-background p-2 text-[11px] leading-snug">
        {JSON.stringify(info, null, 2)}
      </pre>
    </details>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const linkType = searchParams.get("type");
  const debugEnabled =
    searchParams.get("debug") === "1" && process.env.NODE_ENV !== "production";
  const debugLogEnabled = debugEnabled && searchParams.get("debugLog") === "1";

  const [state, setState] = useState<
    "loading" | "ready" | "invalid" | "needs_email"
  >("loading");
  const [debugInfo, setDebugInfo] = useState<ResetPasswordDebugInfo | null>(
    null,
  );
  const [emailForOtp, setEmailForOtp] = useState("");
  const [emailVerifyError, setEmailVerifyError] = useState(false);
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);
  const [pendingOtpCode, setPendingOtpCode] = useState<string | null>(null);
  const didExchangeRef = useRef(false);

  useEffect(() => {
    if (didExchangeRef.current) return;
    didExchangeRef.current = true;

    const run = async () => {
      const supabase = createPasswordResetClient();
      const attempts: DebugAttempt[] = [];

      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const hashToken = hashParams.get("token");
      const hashTokenHash = hashParams.get("token_hash");
      const hashType = hashParams.get("type");
      const hashEmail = hashParams.get("email");

      const debug: ResetPasswordDebugInfo = {
        timestamp: new Date().toISOString(),
        origin: window.location.origin,
        supabaseUrlHost: (() => {
          try {
            return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
          } catch {
            return undefined;
          }
        })(),
        query: {
          codeLen: code?.length ?? 0,
          tokenHashLen: tokenHash?.length ?? 0,
          tokenLen: token?.length ?? 0,
          hasEmail: Boolean(email),
          hasType: Boolean(linkType),
        },
        hash: {
          accessTokenLen: accessToken?.length ?? 0,
          refreshTokenLen: refreshToken?.length ?? 0,
          tokenLen: hashToken?.length ?? 0,
          tokenHashLen: hashTokenHash?.length ?? 0,
          hasEmail: Boolean(hashEmail),
          hasType: Boolean(hashType),
        },
        attempts,
      };

      const finish = (next: "ready" | "invalid" | "needs_email") => {
        if (debugEnabled) {
          setDebugInfo(debug);
          if (debugLogEnabled) {
            // eslint-disable-next-line no-console
            console.info("[reset-password]", debug);
          }
        }
        setState(next);
      };

      const isShortOtpCode = (value: string | null) =>
        Boolean(value && /^\d{6}$/.test(value));

      // 1) PKCE-style links: `?code=...`
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        attempts.push({
          step: "exchangeCodeForSession",
          ok: !error,
          error: summarizeAuthError(error),
        });

        if (!error) {
          finish("ready");
          return;
        }

        // Fallback: some Supabase setups emit recovery tokens under the `code` query key.
        const inferredType = (linkType ?? "recovery") as never;
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: code,
          type: inferredType,
        });
        attempts.push({
          step: "verifyOtp(token_hash=code)",
          ok: !otpError,
          error: summarizeAuthError(otpError),
        });
        if (otpError) {
          if (isShortOtpCode(code) && !email && !linkType) {
            setPendingOtpCode(code);
            finish("needs_email");
            return;
          }
          finish("invalid");
          return;
        }

        finish("ready");
        return;
      }

      // 2) OTP verification links: `?token_hash=...&type=recovery`
      if (tokenHash && linkType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          // `type` is a constrained union in supabase-js; runtime values come from URL.
          type: linkType as never,
        });
        attempts.push({
          step: "verifyOtp(token_hash)",
          ok: !error,
          error: summarizeAuthError(error),
        });
        finish(error ? "invalid" : "ready");
        return;
      }

      // 3) Legacy email OTP links: `?email=...&token=...&type=recovery`
      if (email && token && linkType) {
        const { error } = await supabase.auth.verifyOtp({
          email,
          token,
          type: linkType as never,
        });
        attempts.push({
          step: "verifyOtp(email+token)",
          ok: !error,
          error: summarizeAuthError(error),
        });
        finish(error ? "invalid" : "ready");
        return;
      }

      // 4) Some providers use `token` where we expect `token_hash` (no email)
      if (!email && token && linkType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: linkType as never,
        });
        attempts.push({
          step: "verifyOtp(token_as_token_hash)",
          ok: !error,
          error: summarizeAuthError(error),
        });
        finish(error ? "invalid" : "ready");
        return;
      }

      // 3) Implicit/hash links: `#access_token=...&refresh_token=...&type=recovery`
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        attempts.push({
          step: "setSession(hash_access+refresh)",
          ok: !error,
          error: summarizeAuthError(error),
        });

        // Best-effort: remove tokens from the URL only after success.
        if (!error) {
          try {
            window.location.hash = "";
          } catch {
            // ignore
          }
        }

        finish(error ? "invalid" : "ready");
        return;
      }

      // Hash-based OTP verification (rare, but some clients can rewrite links)
      if (hashTokenHash && hashType) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: hashTokenHash,
          type: hashType as never,
        });
        attempts.push({
          step: "verifyOtp(hash_token_hash)",
          ok: !error,
          error: summarizeAuthError(error),
        });
        finish(error ? "invalid" : "ready");
        return;
      }

      if (hashEmail && hashToken && hashType) {
        const { error } = await supabase.auth.verifyOtp({
          email: hashEmail,
          token: hashToken,
          type: hashType as never,
        });
        attempts.push({
          step: "verifyOtp(hash_email+token)",
          ok: !error,
          error: summarizeAuthError(error),
        });
        finish(error ? "invalid" : "ready");
        return;
      }

      attempts.push({ step: "no_supported_params", ok: false });
      finish("invalid");
    };

    void run();
  }, [code, email, linkType, token, tokenHash, debugEnabled, debugLogEnabled]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Reset your password
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Choose a new password for your account.
            </p>
          </div>

          {state === "loading" && (
            <p className="text-center text-sm text-muted-foreground">
              Validating reset link…
            </p>
          )}
          {state === "invalid" && (
            <div className="space-y-4">
              <InvalidLink />
              {debugInfo && <DebugPanel info={debugInfo} />}
            </div>
          )}
          {state === "needs_email" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the email for this reset link to continue.
              </p>
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!pendingOtpCode) return;
                  setEmailVerifyError(false);
                  setEmailVerifyLoading(true);
                  try {
                    const supabase = createPasswordResetClient();
                    const { error } = await supabase.auth.verifyOtp({
                      email: emailForOtp.trim(),
                      token: pendingOtpCode,
                      type: "recovery" as never,
                    });
                    if (error) {
                      setEmailVerifyError(true);
                      return;
                    }
                    setState("ready");
                  } finally {
                    setEmailVerifyLoading(false);
                  }
                }}
              >
                <div className="space-y-2">
                  <label
                    htmlFor="otp-email"
                    className="block text-sm font-medium text-gray-900"
                  >
                    Email
                  </label>
                  <input
                    id="otp-email"
                    type="email"
                    value={emailForOtp}
                    onChange={(event) => setEmailForOtp(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                {emailVerifyError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                  >
                    We couldn&apos;t verify that email for this reset link.
                  </div>
                )}
                <Button type="submit" fullWidth isLoading={emailVerifyLoading}>
                  Verify email
                </Button>
              </form>
              {debugInfo && <DebugPanel info={debugInfo} />}
            </div>
          )}
          {state === "ready" && <ResetPasswordForm />}
        </div>
      </Card>
    </div>
  );
}

function ResetPasswordLoading() {
  return (
    <AuthPageSkeleton
      title="Loading reset password"
      showForm={true}
      showOAuth={false}
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordLoading />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
