"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@lumia-ui/components";
import { useTranslations } from "next-intl";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormData,
  MAX_PASSWORD_INPUT_LENGTH,
} from "@/lib/validation";
import { createPasswordResetClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const tCommon = useTranslations("auth.common");
  const tReset = useTranslations("auth.resetPassword");
  const [isLoading, setIsLoading] = useState(false);
  const [didSucceed, setDidSucceed] = useState(false);
  const [hasError, setHasError] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: "onBlur",
  });

  const handleUpdatePassword = useCallback(
    async (data: ResetPasswordFormData) => {
      setIsLoading(true);
      setHasError(false);

      try {
        const supabase = createPasswordResetClient();
        const { error } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (error) {
          setHasError(true);
          return;
        }

        setDidSucceed(true);
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  if (didSucceed) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {tReset("successMessage")}
        </div>
        <div className="flex justify-center">
          <a
            href="/login"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            {tReset("backToLogin")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form
      method="post"
      onSubmit={(e) => {
        e.preventDefault();
        void handleSubmit(handleUpdatePassword)(e);
      }}
      className="space-y-4"
    >
      {hasError && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {tReset("errorMessage")}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-900"
        >
          {tReset("fields.newPassword")}
        </label>
        <input
          id="password"
          type="password"
          placeholder={tCommon("fields.passwordPlaceholderNew")}
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_INPUT_LENGTH}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? "password-error" : undefined}
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors.password ? "border-red-500" : "border-gray-300"
          }`}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" className="text-sm text-red-600">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-900"
        >
          {tReset("fields.confirmPassword")}
        </label>
        <input
          id="confirmPassword"
          type="password"
          placeholder={tCommon("fields.passwordPlaceholderConfirm")}
          autoComplete="new-password"
          maxLength={MAX_PASSWORD_INPUT_LENGTH}
          aria-invalid={!!errors.confirmPassword}
          aria-describedby={
            errors.confirmPassword ? "confirm-password-error" : undefined
          }
          className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            errors.confirmPassword ? "border-red-500" : "border-gray-300"
          }`}
          {...register("confirmPassword")}
        />
        {errors.confirmPassword && (
          <p id="confirm-password-error" className="text-sm text-red-600">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        fullWidth
        isLoading={isLoading}
        loadingText={tReset("submitLoading")}
      >
        {tReset("submit")}
      </Button>
    </form>
  );
}
