/**
 * Auth error codes
 */
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_verified'
  | 'user_not_found'
  | 'email_already_exists'
  | 'weak_password'
  | 'invalid_email'
  | 'network_error'
  | 'session_expired'
  | 'rate_limited'
  | 'unknown_error';

/**
 * Auth error object
 */
export interface AuthError {
  code: AuthErrorCode;
  message: string;
}

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Invalid email or password. Please try again.',
  email_not_verified: 'Please verify your email address before signing in.',
  user_not_found: 'No account found with this email address.',
  email_already_exists: 'An account with this email already exists. Try signing in instead.',
  weak_password: 'Password is too weak. Please use a stronger password.',
  invalid_email: 'Please enter a valid email address.',
  network_error: 'Unable to connect. Please check your internet connection.',
  session_expired: 'Your session has expired. Please sign in again.',
  rate_limited: 'Too many attempts. Please wait a moment and try again.',
  unknown_error: 'An unexpected error occurred. Please try again.',
};

/**
 * Retryable error codes
 */
const RETRYABLE_ERRORS: AuthErrorCode[] = ['network_error', 'rate_limited'];

/**
 * Error code mapping from Supabase
 */
const ERROR_CODE_MAP: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_verified',
  user_not_found: 'user_not_found',
  user_already_exists: 'email_already_exists',
  weak_password: 'weak_password',
  invalid_email: 'invalid_email',
  over_request_rate_limit: 'rate_limited',
  session_not_found: 'session_expired',
  // Message patterns
  'invalid login credentials': 'invalid_credentials',
  'email not confirmed': 'email_not_verified',
  'user already registered': 'email_already_exists',
  'password should be': 'weak_password',
  'failed to fetch': 'network_error',
  'network': 'network_error',
  'rate limit': 'rate_limited',
};

/**
 * Normalizes Supabase errors to a consistent format
 */
export function normalizeAuthError(error: unknown): AuthError {
  if (!error) {
    return { code: 'unknown_error', message: ERROR_MESSAGES.unknown_error };
  }

  if (typeof error === 'string') {
    const code = findErrorCode(error);
    return { code, message: ERROR_MESSAGES[code] };
  }

  if (typeof error === 'object') {
    const errorObj = error as { message?: string; code?: string };
    const errorCode = errorObj.code?.toLowerCase() || '';
    const errorMessage = errorObj.message?.toLowerCase() || '';

    // First try to match by code
    if (errorCode && ERROR_CODE_MAP[errorCode]) {
      const code = ERROR_CODE_MAP[errorCode];
      return { code, message: ERROR_MESSAGES[code] };
    }

    // Then try to match by message
    const code = findErrorCode(errorMessage);
    return { code, message: ERROR_MESSAGES[code] };
  }

  return { code: 'unknown_error', message: ERROR_MESSAGES.unknown_error };
}

/**
 * Finds error code by matching message patterns
 */
function findErrorCode(message: string): AuthErrorCode {
  const lowerMessage = message.toLowerCase();

  for (const [pattern, code] of Object.entries(ERROR_CODE_MAP)) {
    if (lowerMessage.includes(pattern)) {
      return code;
    }
  }

  return 'unknown_error';
}

/**
 * Gets user-friendly error message
 */
export function getErrorMessage(code: AuthErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.unknown_error;
}

/**
 * Checks if error is retryable
 */
export function isRetryableError(code: AuthErrorCode): boolean {
  return RETRYABLE_ERRORS.includes(code);
}
