/**
 * OAuth Module
 *
 * Utilities for OAuth authentication flows.
 *
 * @module oauth
 */

export {
  bootstrapUser,
  determineRedirectUrl,
  DEFAULT_NEW_USER_REDIRECT,
  DEFAULT_EXISTING_USER_REDIRECT,
  type BootstrapResponse,
} from "./callback-utils";

export {
  getOAuthErrorMessage,
  OAUTH_ERROR_MESSAGES,
} from "./errors";
