"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@lumia-ui/components";
import {
  signupFormSchema,
  type SignupFormData,
  getPasswordStrength,
  PASSWORD_STRENGTH_CONFIG,
} from "@/lib/validation";
import { normalizeAuthError, type AuthError } from "@/lib/errors";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

interface SignupFormProps {
  onSuccess?: (needsEmailVerification: boolean) => void;
  redirectUrl?: string;
}

export function SignupForm({ onSuccess, redirectUrl }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const [passwordValue, setPasswordValue] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupFormSchema),
    mode: "onBlur",
  });

  const passwordStrength = getPasswordStrength(passwordValue);
  const strengthConfig = PASSWORD_STRENGTH_CONFIG[passwordStrength];

  const handleSignup = useCallback(
    async (data: SignupFormData) => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createBrowserClient();
        const { data: authData, error: authError } = await supabase.auth.signUp(
          {
            email: data.email,
            password: data.password,
            options: {
              emailRedirectTo: redirectUrl
                ? `${
                    window.location.origin
                  }/callback?redirect=${encodeURIComponent(redirectUrl)}`
                : `${window.location.origin}/callback`,
            },
          }
        );

        if (authError) {
          const normalizedError = normalizeAuthError(authError);
          setError(normalizedError);
          return;
        }

        // Check if email confirmation is required
        const needsEmailVerification = authData.user && !authData.session;
        onSuccess?.(needsEmailVerification ?? false);
      } catch (err) {
        const normalizedError = normalizeAuthError(err);
        setError(normalizedError);
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, redirectUrl]
  );

  const handleOAuthSignup = useCallback(
    async (provider: "google" | "github") => {
      setIsLoading(true);
      setError(null);

      try {
        const supabase = createBrowserClient();
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl
              ? `${
                  window.location.origin
                }/callback?redirect=${encodeURIComponent(redirectUrl)}`
              : `${window.location.origin}/callback`,
          },
        });

        if (oauthError) {
          const normalizedError = normalizeAuthError(oauthError);
          setError(normalizedError);
        }
      } catch (err) {
        const normalizedError = normalizeAuthError(err);
        setError(normalizedError);
      } finally {
        setIsLoading(false);
      }
    },
    [redirectUrl]
  );

  return (
    <div className="w-full max-w-md space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Signup failed</p>
          <p>{error.message}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(handleSignup)} className="space-y-4">
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
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
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
            placeholder="Create a strong password"
            autoComplete="new-password"
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.password ? "border-red-500" : "border-gray-300"
            }`}
            {...register("password", {
              onChange: (e) => setPasswordValue(e.target.value),
            })}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
          {passwordValue && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Password strength</span>
                <span className={strengthConfig.color}>
                  {strengthConfig.label}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${strengthConfig.color}`}
                  style={{ width: `${strengthConfig.percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-gray-900"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            autoComplete="new-password"
            className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              errors.confirmPassword ? "border-red-500" : "border-gray-300"
            }`}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          fullWidth
          isLoading={isLoading}
          loadingText="Creating account..."
        >
          Create account
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-gray-500">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => handleOAuthSignup("google")}
          disabled={isLoading}
          className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </button>

        <button
          type="button"
          onClick={() => handleOAuthSignup("github")}
          disabled={isLoading}
          className="flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          GitHub
        </button>
      </div>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <a
          href="/login"
          className="font-medium text-primary-600 hover:underline"
        >
          Sign in
        </a>
      </p>
    </div>
  );
}
