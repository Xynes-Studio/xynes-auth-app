import { describe, it, expect } from 'vitest';
import { isValidRedirectUrl, getSafeRedirectUrl } from './redirect';

describe('redirect utilities', () => {
  const allowedDomains = ['xynes.com', 'localhost:3000', 'localhost:3001'];

  describe('isValidRedirectUrl', () => {
    it('should allow xynes.com subdomain URLs', () => {
      expect(isValidRedirectUrl('https://cms.xynes.com/dashboard', allowedDomains)).toBe(true);
      expect(isValidRedirectUrl('https://auth.xynes.com/login', allowedDomains)).toBe(true);
      expect(isValidRedirectUrl('https://app.xynes.com/', allowedDomains)).toBe(true);
    });

    it('should allow localhost URLs during development', () => {
      expect(isValidRedirectUrl('http://localhost:3000/dashboard', allowedDomains)).toBe(true);
      expect(isValidRedirectUrl('http://localhost:3001/test', allowedDomains)).toBe(true);
    });

    it('should reject external domains', () => {
      expect(isValidRedirectUrl('https://evil.com/phishing', allowedDomains)).toBe(false);
      expect(isValidRedirectUrl('https://xynes.com.evil.com/hack', allowedDomains)).toBe(false);
    });

    it('should reject javascript: URLs', () => {
      expect(isValidRedirectUrl('javascript:alert(1)', allowedDomains)).toBe(false);
    });

    it('should reject data: URLs', () => {
      expect(isValidRedirectUrl('data:text/html,<script>alert(1)</script>', allowedDomains)).toBe(false);
    });

    it('should allow relative URLs', () => {
      expect(isValidRedirectUrl('/dashboard', allowedDomains)).toBe(true);
      expect(isValidRedirectUrl('/settings/profile', allowedDomains)).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidRedirectUrl('not-a-url', allowedDomains)).toBe(false);
      expect(isValidRedirectUrl('', allowedDomains)).toBe(false);
    });
  });

  describe('getSafeRedirectUrl', () => {
    const defaultUrl = '/dashboard';

    it('should return valid URL if it passes validation', () => {
      expect(getSafeRedirectUrl('https://cms.xynes.com/settings', defaultUrl, allowedDomains))
        .toBe('https://cms.xynes.com/settings');
    });

    it('should return default URL for invalid URLs', () => {
      expect(getSafeRedirectUrl('https://evil.com', defaultUrl, allowedDomains))
        .toBe(defaultUrl);
    });

    it('should return default URL for empty input', () => {
      expect(getSafeRedirectUrl('', defaultUrl, allowedDomains)).toBe(defaultUrl);
      expect(getSafeRedirectUrl(null as unknown as string, defaultUrl, allowedDomains)).toBe(defaultUrl);
    });

    it('should allow relative URLs', () => {
      expect(getSafeRedirectUrl('/settings', defaultUrl, allowedDomains)).toBe('/settings');
    });
  });
});
