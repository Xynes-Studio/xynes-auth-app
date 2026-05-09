"use client";

import {
  useCallback,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormData,
} from "@/lib/validation";
import { createPasswordResetClient } from "@/lib/supabase/client";
import { isAccountEnumerationSensitiveResetError } from "@/lib/password-reset/password-reset-utils";

export function ForgotPasswordForm() {
  const tCommon = useTranslations("auth.common");
  const tForgot = useTranslations("auth.forgotPassword");
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

  const handleRequestReset = useCallback(
    async (data: ForgotPasswordFormData) => {
      setIsLoading(true);
      setDidSucceed(false);
      setHasUnexpectedError(false);

      try {
        const supabase = createPasswordResetClient();
        const { error } = await supabase.auth.resetPasswordForEmail(
          data.email,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          },
        );

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
    },
    [],
  );

  if (didSucceed) {
    return (
      <div
        role="status"
        className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
      >
        {tForgot("successMessage")}
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
          {tForgot("errorMessage")}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-900"
        >
          {tCommon("fields.email")}
        </label>
        <input
          id="email"
          type="email"
          placeholder={tCommon("fields.emailPlaceholder")}
          autoComplete="email"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email?.message ? (
          <p
            id="email-error"
            className="text-sm text-red-600"
            role="alert"
            aria-live="polite"
          >
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? tForgot("submitLoading") : tForgot("submit")}
      </button>
    </form>
  );
}
