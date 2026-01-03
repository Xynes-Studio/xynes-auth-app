import { describe, it, expect } from 'vitest';
import {
  signupFormSchema,
  validateEmail,
  validatePassword,
  getPasswordStrength,
} from './validation';

describe('signup validation', () => {
  describe('signupFormSchema', () => {
    it('should validate valid signup data', () => {
      const result = signupFormSchema.safeParse({
        email: 'user@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = signupFormSchema.safeParse({
        email: 'invalid-email',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject weak password', () => {
      const result = signupFormSchema.safeParse({
        email: 'user@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      });
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const result = signupFormSchema.safeParse({
        email: 'user@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'DifferentPass123!',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty fields', () => {
      const result = signupFormSchema.safeParse({
        email: '',
        password: '',
        confirmPassword: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateEmail', () => {
    it('should return valid for correct email', () => {
      expect(validateEmail('user@example.com')).toEqual({ isValid: true });
    });

    it('should return error for empty email', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Email is required');
    });

    it('should return error for invalid format', () => {
      const result = validateEmail('invalid');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });
  });

  describe('validatePassword', () => {
    it('should return valid for strong password', () => {
      expect(validatePassword('SecurePass123!')).toEqual({ isValid: true });
    });

    it('should reject short passwords', () => {
      const result = validatePassword('Abc1!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least 8 characters');
    });

    it('should reject passwords without uppercase', () => {
      const result = validatePassword('securepass123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('uppercase');
    });

    it('should reject passwords without lowercase', () => {
      const result = validatePassword('SECUREPASS123!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('SecurePass!!');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('number');
    });
  });

  describe('getPasswordStrength', () => {
    it('should return weak for short passwords', () => {
      expect(getPasswordStrength('abc')).toBe('weak');
    });

    it('should return weak for passwords with only length and one char type', () => {
      // Score: 1 (length >= 8) + 1 (lowercase) = 2 -> weak
      expect(getPasswordStrength('abcdefgh')).toBe('weak');
    });

    it('should return fair for medium passwords with mixed case', () => {
      // Score: 1 (length >= 8) + 1 (lowercase) + 1 (uppercase) = 3 -> fair
      expect(getPasswordStrength('Abcdefgh')).toBe('fair');
    });

    it('should return good for good passwords', () => {
      // Score: 1 (length >= 8) + 1 (lowercase) + 1 (uppercase) + 1 (number) = 4 -> good
      expect(getPasswordStrength('Abcdefgh1')).toBe('good');
    });

    it('should return strong for strong passwords', () => {
      // Score: 1 (length >= 8) + 1 (length >= 12) + 1 (lowercase) + 1 (uppercase) + 1 (number) + 1 (special) = 6 -> strong
      expect(getPasswordStrength('SecurePass123!')).toBe('strong');
    });
  });
});
