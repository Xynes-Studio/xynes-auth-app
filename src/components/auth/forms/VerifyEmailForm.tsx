"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { EmailOtpType } from "@supabase/supabase-js";
import { Button, Input } from "@lumia-ui/components";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { getAllowedRedirectDomains } from "@/lib/redirect";
import { determinePostLoginDestination } from "@/lib/auth/post-login-destination";
import { fetchMeBootstrap } from "@/lib/profile/profile-api";

const verifyEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  code: z
    .string()
    .trim()
    .min(6, "Enter the 6-digit code from your email")
    .max(12, "Enter the 6-digit code from your email"),
});

type VerifyEmailData = z.infer<typeof verifyEmailSchema>;

const RESEND_COOLDOWN_SECONDS = 30;

interface VerifyEmailFormProps {
  initialEmail?: string;
  redirectUrl?: string;
}

function normalizeOtpType(value: string | null): EmailOtpType {
  if (value === "signup") return "signup";
  if (value === "email") return "email";
  return "signup";
}

export function VerifyEmailForm({ initialEmail, redirectUrl }: VerifyEmailFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const allowedRedirectDomains = useMemo(() => getAllowedRedirectDomains(), []);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setFocus,
    formState: { errors },
  } = useForm<VerifyEmailData>({
    resolver: zodResolver(verifyEmailSchema),
    mode: "onBlur",
    defaultValues: {
      email: initialEmail ?? "",
      code: "",
    },
  });

  const emailValue = watch("email");

  const resolveVerifiedDestination = useCallback(async () => {
    const fallbackDestination = redirectUrl || "/onboarding";

    try {
      const me = await fetchMeBootstrap();
      return determinePostLoginDestination({
        workspaces: me.workspaces,
        redirectParam: redirectUrl,
        allowedRedirectDomains,
        requiresProfileCompletion: !me.user?.displayName?.trim(),
      });
    } catch {
      return fallbackDestination;
    }
  }, [allowedRedirectDomains, redirectUrl]);

  const navigateToPostVerifyDestination = useCallback(async () => {
    const destination = await resolveVerifiedDestination();
    if (/^https?:\/\//i.test(destination) || destination.startsWith("//")) {
      window.location.assign(destination);
      return;
    }
    router.replace(destination);
  }, [resolveVerifiedDestination, router]);

  const verifyByOtpLink = useCallback(async () => {
    const tokenHash = searchParams.get("token_hash");
    if (!tokenHash) return;

    setIsLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const otpType = normalizeOtpType(searchParams.get("type"));
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });

      if (error) {
        setErrorMessage("This verification link is invalid or expired.");
        return;
      }

      setStatusMessage("Email verified. Redirecting...");
      await navigateToPostVerifyDestination();
    } catch (error) {
      console.error("OTP link verification failed:", error);
      setErrorMessage("Network error verifying link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [navigateToPostVerifyDestination, searchParams]);

  useEffect(() => {
    void verifyByOtpLink();
  }, [verifyByOtpLink]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  const handleVerifyCode = useCallback(
    async (data: VerifyEmailData) => {
      setIsLoading(true);
      setErrorMessage(null);
      setStatusMessage(null);

      try {
        const supabase = createBrowserClient();
        const { error } = await supabase.auth.verifyOtp({
          email: data.email.trim(),
          token: data.code.trim(),
          type: "signup",
        });

        if (error) {
          setErrorMessage("The code is invalid or expired. Please try again.");
          setFocus("code");
          return;
        }

        setStatusMessage("Email verified. Redirecting...");
        await navigateToPostVerifyDestination();
      } catch {
        setErrorMessage("Unable to verify the code right now. Please try again.");
        setFocus("code");
      } finally {
        setIsLoading(false);
      }
    },
    [navigateToPostVerifyDestination, setFocus],
  );

  const handleResendCode = useCallback(async () => {
    const normalizedEmail = emailValue.trim();
    if (!normalizedEmail) {
      setErrorMessage("Enter your email first to resend the code.");
      setFocus("email");
      return;
    }

    setResendLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });

      if (error) {
        setErrorMessage("We couldn't resend the code right now. Please try again.");
        return;
      }

      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      setStatusMessage("A new verification code has been sent.");
    } catch {
      setErrorMessage("We couldn't resend the code right now. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }, [emailValue, setFocus]);

  return (
    <form
      method="post"
      onSubmit={handleSubmit(handleVerifyCode)}
      className="space-y-4"
      noValidate
    >
      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {statusMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      ) : null}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "verify-email-error" : undefined}
          invalid={Boolean(errors.email)}
          {...register("email", {
            onChange: (event) => {
              setErrorMessage(null);
              setStatusMessage(null);
              setValue("email", event.target.value);
            },
          })}
        />
        {errors.email?.message ? (
          <p
            id="verify-email-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="code" className="block text-sm font-medium text-foreground">
          Verification code
        </label>
        <Input
          id="code"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Enter the 6-digit code"
          autoComplete="one-time-code"
          aria-invalid={Boolean(errors.code)}
          aria-describedby={errors.code ? "verify-code-error" : undefined}
          invalid={Boolean(errors.code)}
          {...register("code")}
        />
        {errors.code?.message ? (
          <p
            id="verify-code-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-red-600"
          >
            {errors.code.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" isLoading={isLoading} loadingText="Verifying..." className="w-full">
        Verify email
      </Button>

      <Button
        type="button"
        variant="outline"
        disabled={resendLoading || cooldownSeconds > 0}
        onClick={handleResendCode}
        className="w-full"
      >
        {resendLoading
          ? "Resending..."
          : cooldownSeconds > 0
            ? `Resend code in ${cooldownSeconds}s`
            : "Resend code"}
      </Button>
    </form>
  );
}
