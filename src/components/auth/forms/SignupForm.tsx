"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button, Input } from "@lumia-ui/components";
import { useFeatureFlags, useOAuthProviders } from "@xynes/auth-sdk";
import {
  signupFormSchema,
  type SignupFormData,
  getPasswordStrength,
  PASSWORD_STRENGTH_CONFIG,
  MAX_PASSWORD_LENGTH,
  MAX_PASSWORD_INPUT_LENGTH,
} from "@/lib/validation";
import { normalizeAuthError, type AuthError } from "@/lib/errors";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { AuthDivider, AuthErrorAlert, OAuthButtons } from "../../ui";
import { FormFieldError } from "./FormFieldError";

interface SignupFormProps {
  onSuccess?: (needsEmailVerification: boolean) => void;
  redirectUrl?: string;
}

export function SignupForm({ onSuccess, redirectUrl }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const oauthProviders = useOAuthProviders();
  const {
    flags,
    isLoading: flagsLoading,
    error: flagsError,
  } = useFeatureFlags();
  const authDebug = process.env.NEXT_PUBLIC_AUTH_DEBUG === "true";

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: "onBlur",
  });

  const passwordStrength = getPasswordStrength(passwordValue);
  const strengthConfig = PASSWORD_STRENGTH_CONFIG[passwordStrength];

  const clearError = useCallback(() => {
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleSignup = useCallback(
    async (data: SignupFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        if (authDebug) {
          console.info("[auth-signup] submit");
        }
        const supabase = createBrowserClient();
        const callbackBaseUrl = (
          process.env.NEXT_PUBLIC_AUTH_APP_URL ?? window.location.origin
        ).replace(/\/$/, "");
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: data.email.trim(),
            password: data.password,
            options: {
              emailRedirectTo: redirectUrl
                ? `${callbackBaseUrl}/callback?redirect=${encodeURIComponent(
                    redirectUrl,
                  )}`
                : `${callbackBaseUrl}/callback`,
            },
          },
        );

        if (authError) {
          const normalizedError = normalizeAuthError(authError);
          setError(normalizedError);
          return;
        }

        const needsEmailVerification = authData.user && !authData.session;
        onSuccess?.(needsEmailVerification ?? false);
      } catch (err) {
        const normalizedError = normalizeAuthError(err);
        setError(normalizedError);
      } finally {
        setIsLoading(false);
      }
    },
    [authDebug, onSuccess, redirectUrl],
  );

  useEffect(() => {
    if (!authDebug) return;
    console.info("[auth-signup] hydrated", {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  }, [authDebug]);

  useEffect(() => {
    if (!authDebug) return;
    console.info("[auth-flags]", {
      oauthProviders,
      flags,
      flagsLoading,
      flagsError: flagsError?.message ?? null,
    });
  }, [authDebug, oauthProviders, flags, flagsLoading, flagsError]);

  const handleOAuthError = useCallback((oauthError: AuthError) => {
    setError(oauthError);
  }, []);

  const handleOAuthLoadingChange = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  return (
    <div className="w-full max-w-md space-y-6">
      <AuthErrorAlert error={error} title="Signup failed" />

      <form
        method="post"
        onSubmit={handleSubmit(handleSignup)}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-foreground"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com…"
            autoComplete="email"
            spellCheck={false}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            invalid={Boolean(errors.email)}
            {...register("email", {
              onChange: clearError,
            })}
          />
          <FormFieldError id="email-error" message={errors.email?.message} />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="Create a strong password…"
            autoComplete="new-password"
            maxLength={MAX_PASSWORD_INPUT_LENGTH}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            invalid={Boolean(errors.password)}
            {...register("password", {
              onChange: (e) => {
                const nextValue = e.target.value;
                setPasswordValue(nextValue);
                clearError();
                if (nextValue.length > MAX_PASSWORD_LENGTH) {
                  void trigger("password");
                }
              },
            })}
          />
          <FormFieldError
            id="password-error"
            message={errors.password?.message}
          />
          {passwordValue && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground/70">Password strength</span>
                <span className={strengthConfig.color}>
                  {strengthConfig.label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strengthConfig.color}`}
                  style={{ width: `${strengthConfig.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <Button
          type="submit"
          isLoading={isLoading}
          loadingText="Creating account..."
        >
          Create account
        </Button>
      </form>

      <AuthDivider />

      <OAuthButtons
        redirectUrl={redirectUrl}
        disabled={isLoading}
        onError={handleOAuthError}
        onLoadingChange={handleOAuthLoadingChange}
        providers={oauthProviders}
      />

      <p className="text-center text-sm text-foreground/70">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
