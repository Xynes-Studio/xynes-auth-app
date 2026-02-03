"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@lumia-ui/components";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormData,
} from "@/lib/validation";
import { createPasswordResetClient } from "@/lib/supabase/client";
import { isAccountEnumerationSensitiveResetError } from "@/lib/password-reset/password-reset-utils";

const GENERIC_SUCCESS_MESSAGE =
  "If an account exists for that email, you’ll receive a password reset link shortly.";

export function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);
  const [hasUnexpectedError, setHasUnexpectedError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordFormSchema),
    mode: "onBlur",
  });

  const handleRequestReset = useCallback(async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setDidSucceed(false);
    setHasUnexpectedError(false);

    try {
      const supabase = createPasswordResetClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (isAccountEnumerationSensitiveResetError(error)) {
          setDidSucceed(true);
          return;
        }

        setHasUnexpectedError(true);
        return;
      }

      setDidSucceed(true);
    } catch {
      setHasUnexpectedError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (didSucceed) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        {GENERIC_SUCCESS_MESSAGE}
      </div>
    );
  }

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(handleRequestReset)(e);
      }}
      className="space-y-4"
    >
      {hasUnexpectedError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          We couldn&apos;t send a reset email right now. Please try again later.
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium text-gray-900">
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
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        )}
      </div>

      <Button type="submit" fullWidth isLoading={isLoading} loadingText="Sending...">
        Send reset link
      </Button>
    </form>
  );
}
