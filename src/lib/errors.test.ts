import { describe, it, expect } from 'vitest';
import { normalizeAuthError, getErrorMessage, isRetryableError } from './errors';
import type { AuthErrorCode } from './errors';

describe('error utilities', () => {
  describe('normalizeAuthError', () => {
    it('should normalize invalid credentials error', () => {
      const error = normalizeAuthError({ message: 'Invalid login credentials' });
      expect(error.code).toBe('invalid_credentials');
    });

    it('should normalize email not confirmed error', () => {
      const error = normalizeAuthError({ message: 'Email not confirmed', code: 'email_not_confirmed' });
      expect(error.code).toBe('email_not_verified');
    });

    it('should normalize user already exists error', () => {
      const error = normalizeAuthError({ message: 'User already registered' });
      expect(error.code).toBe('email_already_exists');
    });

    it('should normalize weak password error', () => {
      const error = normalizeAuthError({ message: 'Password should be at least 8 characters' });
      expect(error.code).toBe('weak_password');
    });

    it('should normalize rate limit error', () => {
      const error = normalizeAuthError({ code: 'over_request_rate_limit' });
      expect(error.code).toBe('rate_limited');
    });

    it('should normalize network errors', () => {
      const error = normalizeAuthError({ message: 'Failed to fetch' });
      expect(error.code).toBe('network_error');
    });

    it('should return unknown_error for unrecognized errors', () => {
      const error = normalizeAuthError({ message: 'Something random happened' });
      expect(error.code).toBe('unknown_error');
    });

    it('should handle null/undefined', () => {
      const error = normalizeAuthError(null);
      expect(error.code).toBe('unknown_error');
    });
  });

  describe('getErrorMessage', () => {
    it('should return user-friendly message for each error code', () => {
      expect(getErrorMessage('invalid_credentials')).toContain('Invalid');
      expect(getErrorMessage('email_not_verified')).toContain('verify');
      expect(getErrorMessage('email_already_exists')).toContain('already exists');
      expect(getErrorMessage('weak_password')).toContain('weak');
      expect(getErrorMessage('network_error')).toContain('connection');
      expect(getErrorMessage('rate_limited')).toContain('Too many');
    });
  });

  describe('isRetryableError', () => {
    it('should return true for network errors', () => {
      expect(isRetryableError('network_error')).toBe(true);
    });

    it('should return true for rate limited errors', () => {
      expect(isRetryableError('rate_limited')).toBe(true);
    });

    it('should return false for credential errors', () => {
      expect(isRetryableError('invalid_credentials')).toBe(false);
      expect(isRetryableError('email_already_exists')).toBe(false);
    });
  });
});
