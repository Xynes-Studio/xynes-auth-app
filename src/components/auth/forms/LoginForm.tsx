"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Button, Flex, Input } from "@lumia-ui/components";
import { useFeatureFlags, useOAuthProviders } from "@xynes/auth-sdk";
import {
  loginFormSchema,
  type LoginFormData,
  MAX_PASSWORD_LENGTH,
  MAX_PASSWORD_INPUT_LENGTH,
} from "@/lib/validation";
import { normalizeAuthError, type AuthError } from "@/lib/errors";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { OAuthButtons, AuthDivider, AuthErrorAlert } from "../../ui";
import { FormFieldError } from "./FormFieldError";

interface LoginFormProps {
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function LoginForm({ onSuccess, redirectUrl }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
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
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: "onBlur",
  });

  const clearError = useCallback(() => {
    if (error) {
      setError(null);
    }
  }, [error]);

  const handleLogin = useCallback(
    async (data: LoginFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        if (authDebug) {
          console.info("[auth-login] submit");
        }
        const supabase = createBrowserClient();
        const { data: authData, error: authError } =
          await supabase.auth.signInWithPassword({
            email: data.email.trim(),
            password: data.password,
          });

        if (authError) {
          const normalizedError = normalizeAuthError(authError);
          setError(normalizedError);
          return;
        }

        if (authData.session) {
          onSuccess?.();
        }
      } catch (err) {
        const normalizedError = normalizeAuthError(err);
        setError(normalizedError);
      } finally {
        setIsLoading(false);
      }
    },
    [authDebug, onSuccess],
  );

  useEffect(() => {
    if (!authDebug) return;
    console.info("[auth-login] hydrated", {
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
      <AuthErrorAlert error={error} title="Login failed" />

      <form
        onSubmit={handleSubmit(handleLogin)}
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
            placeholder="Enter your password…"
            autoComplete="current-password"
            maxLength={MAX_PASSWORD_INPUT_LENGTH}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            invalid={Boolean(errors.password)}
            {...register("password", {
              onChange: (e) => {
                clearError();
                if (e.target.value.length > MAX_PASSWORD_LENGTH) {
                  void trigger("password");
                }
              },
            })}
          />
          <FormFieldError
            id="password-error"
            message={errors.password?.message}
          />
        </div>
        <Flex align="center" className="gap-4">
          <Button
            type="submit"
            isLoading={isLoading}
            loadingText="Signing in..."
          >
            Continue
          </Button>
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2"
            >
              Forgot password?
            </Link>
          </div>
        </Flex>
      </form>

      <AuthDivider />

      <OAuthButtons
        redirectUrl={redirectUrl}
        disabled={isLoading}
        onError={handleOAuthError}
        onLoadingChange={handleOAuthLoadingChange}
        providers={oauthProviders}
      />
    </div>
  );
}
