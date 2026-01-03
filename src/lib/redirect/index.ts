/**
 * Auth App Redirect Utilities
 *
 * Re-exports redirect utilities from @xynes/auth-sdk for consistency.
 *
 * @module redirect
 */

// Re-export all redirect utilities from SDK
export {
  isValidRedirectUrl,
  getSafeRedirectUrl,
  buildAuthRedirectUrl,
} from "@xynes/auth-sdk";
