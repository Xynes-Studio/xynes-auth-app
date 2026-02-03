"use client";

import { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@lumia-ui/components";
import { useOAuthProviders } from "@xynes/auth-sdk";
import {
  loginFormSchema,
  type LoginFormData,
  MAX_PASSWORD_LENGTH,
  MAX_PASSWORD_INPUT_LENGTH,
} from "@/lib/validation";
import { normalizeAuthError, type AuthError } from "@/lib/errors";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { OAuthButtons, AuthDivider, AuthErrorAlert } from "./ui";

interface LoginFormProps {
  onSuccess?: () => void;
  redirectUrl?: string;
}

export function LoginForm({ onSuccess, redirectUrl }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const oauthProviders = useOAuthProviders();
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
    [authDebug, onSuccess]
  );

  const handleFormSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      void handleSubmit(handleLogin)(event);
    },
    [handleSubmit, handleLogin]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLFormElement>) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      void handleSubmit(handleLogin)();
    },
    [handleSubmit, handleLogin]
  );

  useEffect(() => {
    if (!authDebug) return;
    console.info("[auth-login] hydrated", {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  }, [authDebug]);

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
        onSubmit={handleFormSubmit}
        onKeyDown={handleKeyDown}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-900"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            {...register("email", {
              onChange: clearError,
            })}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-900"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            maxLength={MAX_PASSWORD_INPUT_LENGTH}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? "password-error" : undefined}
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.password ? "border-red-500" : "border-gray-300"
            }`}
            {...register("password", {
              onChange: (e) => {
                clearError();
                if (e.target.value.length > MAX_PASSWORD_LENGTH) {
                  void trigger("password");
                }
              },
            })}
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
          <div className="flex justify-end">
            <a
              href="/forgot-password"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              Forgot password?
            </a>
          </div>
        </div>

        <Button
          type="button"
          fullWidth
          isLoading={isLoading}
          loadingText="Signing in..."
          onClick={() => void handleSubmit(handleLogin)()}
        >
          Sign in
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

      <p className="text-center text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <a
          href="/signup"
          className="font-medium text-primary-600 hover:underline"
        >
          Sign up
        </a>
      </p>
    </div>
  );
}
