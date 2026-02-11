"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input } from "@lumia-ui/components";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormData,
} from "@/lib/validation";
import { createPasswordResetClient } from "@/lib/supabase/client";
import { isAccountEnumerationSensitiveResetError } from "@/lib/password-reset/password-reset-utils";
import { FormFieldError } from "./FormFieldError";

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
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-900"
        >
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          invalid={Boolean(errors.email)}
          {...register("email")}
        />
        <FormFieldError id="email-error" message={errors.email?.message} />
      </div>

      <Button type="submit" isLoading={isLoading} loadingText="Sending...">
        Send reset link
      </Button>
    </form>
  );
}
