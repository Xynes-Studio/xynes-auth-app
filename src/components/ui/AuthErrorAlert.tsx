"use client";

import { useTranslations } from "next-intl";
import { getAuthErrorMessageKey } from "@xynes/auth-sdk";
import type { AuthError } from "@/lib/errors";

interface AuthErrorAlertProps {
  error: AuthError | null;
  /**
   * Heading shown above the error body. Translated by the caller (the form
   * owns the per-form heading copy: "Login failed", "Signup failed", …).
   *
   * If `undefined`, falls back to the alert's own translated default
   * (`auth.errors.alertTitles.generic`).
   */
  title?: string;
}

/**
 * Reusable error alert component for auth forms.
 *
 * Resolves the alert body via `auth.errors.codes.<code>` so the body is
 * localized in every supported locale (TFU-2). The SDK's `error.message`
 * (en-US) is intentionally NOT rendered — it is kept on the `AuthError`
 * object as a developer-facing fallback only.
 *
 * @security The translation key resolution path is closed-set: the SDK's
 * `getAuthErrorMessageKey` always returns a stable identifier from
 * `AUTH_ERROR_MESSAGE_KEYS` (or `"unknown_error"` for any unrecognized
 * code), so a hostile upstream `error.code` can never escape the
 * `auth.errors.codes` namespace or leak through to the rendered DOM.
 */
export function AuthErrorAlert({ error, title }: AuthErrorAlertProps) {
  const tTitles = useTranslations("auth.errors.alertTitles");
  const tCodes = useTranslations("auth.errors.codes");

  if (!error) {
    return null;
  }

  const messageKey = getAuthErrorMessageKey(error.code);
  const resolvedTitle = title ?? tTitles("generic");
  const resolvedMessage = tCodes(messageKey);

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p className="font-medium">{resolvedTitle}</p>
      <p>{resolvedMessage}</p>
    </div>
  );
}
