/**
 * Auth App Error Utilities
 *
 * Re-exports error utilities from @xynes/auth-sdk for consistency,
 * plus OAuth-specific error handling.
 *
 * @module errors
 */

// Re-export all error utilities from SDK
export {
  normalizeAuthError,
  isRetryableError,
  getErrorMessage,
  type AuthError,
  type AuthErrorCode,
} from "@xynes/auth-sdk";

// Export OAuth error utilities
export {
  getOAuthErrorMessage,
  OAUTH_ERROR_MESSAGES,
} from "./oauth-errors";
