/**
 * OAuth Error Messages
 *
 * User-friendly error messages for OAuth error codes.
 * Based on OAuth 2.0 RFC 6749 error codes.
 *
 * @module errors/oauth
 */

/**
 * Maps OAuth error codes to user-friendly error messages.
 */
export const OAUTH_ERROR_MESSAGES: Record<string, string> = {
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
export function getOAuthErrorMessage(
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
