import type { AuthError } from "@/lib/errors";

interface AuthErrorAlertProps {
  error: AuthError | null;
  title?: string;
}

/**
 * Reusable error alert component for auth forms.
 * Displays authentication errors in a consistent format.
 */
export function AuthErrorAlert({
  error,
  title = "An error occurred",
}: AuthErrorAlertProps) {
  if (!error) {
    return null;
  }

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
    >
      <p className="font-medium">{title}</p>
      <p>{error.message}</p>
    </div>
  );
}
