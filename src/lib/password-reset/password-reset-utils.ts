export type PasswordResetRequestError = {
  message?: string;
  status?: number;
};

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const maybeMessage = (error as { message?: unknown }).message;
  return typeof maybeMessage === "string" ? maybeMessage : "";
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const maybeStatus = (error as { status?: unknown }).status;
  return typeof maybeStatus === "number" ? maybeStatus : null;
}

/**
 * Returns true when we should treat the password-reset request as "successful"
 * from a user messaging perspective to avoid account enumeration.
 */
export function isAccountEnumerationSensitiveResetError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);

  // Defensive: treat these as non-actionable for the user and avoid hinting at existence.
  if (status === 404) return true;
  if (message.includes("user not found")) return true;

  return false;
}

