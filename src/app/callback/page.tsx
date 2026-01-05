"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@lumia-ui/components";
import { getSafeRedirectUrl } from "@/lib/redirect";

/**
 * Allowed redirect domains for security validation.
 * Prevents open redirect attacks.
 */
const ALLOWED_REDIRECT_DOMAINS = (
  process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS || "xynes.com,localhost:3000"
).split(",");

/**
 * Default redirect URL after successful OAuth callback.
 */
const DEFAULT_REDIRECT = "/onboarding";

/**
 * Maps OAuth error codes to user-friendly error messages.
 * Based on OAuth 2.0 RFC 6749 error codes.
 */
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied:
    "You denied the request or the OAuth provider declined access. Please try again.",
  invalid_request:
    "The authentication request was invalid. Please try signing in again.",
  unauthorized_client:
    "This application is not authorized to use this sign-in method.",
  unsupported_response_type:
    "The authentication method is unsupported. Please contact support.",
  invalid_scope:
    "The requested permissions (scope) are invalid. Please contact support.",
  server_error:
    "The authentication server encountered an error. Please try again later.",
  temporarily_unavailable:
    "The authentication service is temporarily unavailable. Please try again later.",
  auth_callback_error:
    "There was an error processing your sign-in. Please try again.",
};

/**
 * Gets a user-friendly error message for an OAuth error code.
 *
 * @param errorCode - The OAuth error code from the URL
 * @param errorDescription - Optional error description from the provider
 * @returns A user-friendly error message
 */
function getErrorMessage(
  errorCode: string,
  errorDescription?: string | null
): string {
  // If provider gave a description, use it
  if (errorDescription) {
    return errorDescription;
  }

  // Use mapped message or generic fallback
  return (
    OAUTH_ERROR_MESSAGES[errorCode] ||
    "Something went wrong during authentication. Please try again."
  );
}

/**
 * Loading spinner component for OAuth callback processing.
 */
function LoadingSpinner() {
  return (
    <div
      className="flex flex-col items-center justify-center space-y-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative">
        <div
          className="h-12 w-12 rounded-full border-4 border-gray-200"
          aria-hidden="true"
        />
        <div
          className="absolute top-0 left-0 h-12 w-12 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"
          aria-hidden="true"
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Completing your sign-in...
      </p>
    </div>
  );
}

/**
 * Error display component for OAuth callback errors.
 */
interface ErrorDisplayProps {
  errorCode: string;
  errorDescription?: string | null;
}

function ErrorDisplay({ errorCode, errorDescription }: ErrorDisplayProps) {
  const errorMessage = getErrorMessage(errorCode, errorDescription);

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center space-y-6 text-center"
    >
      {/* Error icon */}
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
        aria-hidden="true"
      >
        <svg
          className="h-8 w-8 text-red-600"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      {/* Error content */}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-foreground">
          Authentication Failed
        </h1>
        <p className="text-sm text-muted-foreground max-w-sm">{errorMessage}</p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-background bg-primary text-secondary hover:bg-primary-700 active:bg-primary-800 h-10 px-4"
        >
          Try Again
        </Link>
        <Link
          href="/"
          className="text-center text-sm text-muted-foreground hover:text-foreground hover:underline"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}

/**
 * Main callback content component.
 * Handles OAuth callback processing and error display.
 */
function CallbackContent() {
  const searchParams = useSearchParams();

  // Check for OAuth error in URL params
  const errorCode = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Get redirect URL and validate it
  const redirectParam = searchParams.get("redirect");
  const redirectUrl = getSafeRedirectUrl(
    redirectParam || "",
    DEFAULT_REDIRECT,
    ALLOWED_REDIRECT_DOMAINS
  );

  // If there's an error, show the error display
  if (errorCode) {
    return <ErrorDisplay errorCode={errorCode} errorDescription={errorDescription} />;
  }

  // Otherwise show loading state
  // The actual OAuth code exchange happens in the route.ts (server-side)
  // This page is only shown during the redirect or if there's an error
  return (
    <div className="space-y-4">
      <LoadingSpinner />
      {/* Hidden text for screen readers about redirect */}
      <p className="sr-only">
        {redirectParam
          ? `You will be redirected to ${redirectUrl} after sign-in completes.`
          : "You will be redirected after sign-in completes."}
      </p>
    </div>
  );
}

/**
 * Loading fallback for Suspense boundary.
 */
function CallbackLoading() {
  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div
        className="h-12 w-12 rounded-full border-4 border-gray-200 animate-pulse"
        aria-hidden="true"
      />
      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}

/**
 * OAuth Callback Page
 *
 * This page handles the OAuth callback flow:
 * 1. Shows loading state while the server-side route processes the OAuth code
 * 2. Displays errors if OAuth authentication fails
 * 3. Redirects to the appropriate page on success (handled by route.ts)
 *
 * The actual OAuth code-to-session exchange happens server-side in route.ts.
 * This page is primarily for showing loading states and handling client-side errors.
 */
export default function CallbackPage() {
  return (
    <main
      className="flex min-h-screen items-center justify-center p-4 bg-gray-50"
      role="main"
    >
      <Card className="w-full max-w-md p-8">
        <Suspense fallback={<CallbackLoading />}>
          <CallbackContent />
        </Suspense>
      </Card>
    </main>
  );
}
