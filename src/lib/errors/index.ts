/**
 * Auth App Error Utilities
 *
 * Re-exports error utilities from @xynes/auth-sdk for consistency.
 * OAuth-specific errors are in @/lib/oauth/errors.
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
