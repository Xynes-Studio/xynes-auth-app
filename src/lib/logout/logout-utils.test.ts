/**
 * Logout Utilities - Unit Tests (Tier 1)
 *
 * Tests for pure logout utility functions.
 * These functions handle logout redirect URL building and cookie configurations.
 *
 * @see ADR-001 Testing Standards
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  buildLogoutRedirectUrl,
  getPostLogoutRedirectUrl,
  SUPABASE_COOKIE_PREFIXES,
  getCookieClearingOptions,
  getSupabaseCookieNames,
} from "./logout-utils";

describe("logout-utils", () => {
  describe("buildLogoutRedirectUrl", () => {
    it("should build a logout URL with default login path", () => {
      const result = buildLogoutRedirectUrl("https://auth.xynes.com");

      expect(result).toBe("https://auth.xynes.com/login");
    });

    it("should build a logout URL with custom redirect", () => {
      const result = buildLogoutRedirectUrl(
        "https://auth.xynes.com",
        "https://cms.xynes.com/dashboard"
      );

      expect(result).toBe(
        "https://auth.xynes.com/login?redirect=https%3A%2F%2Fcms.xynes.com%2Fdashboard"
      );
    });

    it("should handle trailing slashes in base URL", () => {
      const result = buildLogoutRedirectUrl("https://auth.xynes.com/");

      expect(result).toBe("https://auth.xynes.com/login");
    });

    it("should handle relative redirect URLs", () => {
      const result = buildLogoutRedirectUrl("https://auth.xynes.com", "/home");

      expect(result).toBe("https://auth.xynes.com/login?redirect=%2Fhome");
    });

    it("should handle empty redirect URL", () => {
      const result = buildLogoutRedirectUrl("https://auth.xynes.com", "");

      expect(result).toBe("https://auth.xynes.com/login");
    });
  });

  describe("getPostLogoutRedirectUrl", () => {
    it("should return valid redirect URL when in allowed domains", () => {
      const result = getPostLogoutRedirectUrl(
        "https://cms.xynes.com/dashboard",
        "/login",
        ["xynes.com", "localhost:3000"]
      );

      expect(result).toBe("https://cms.xynes.com/dashboard");
    });

    it("should return default URL for invalid redirect", () => {
      const result = getPostLogoutRedirectUrl(
        "https://malicious.com/phishing",
        "/login",
        ["xynes.com", "localhost:3000"]
      );

      expect(result).toBe("/login");
    });

    it("should handle relative URLs as valid", () => {
      const result = getPostLogoutRedirectUrl("/dashboard", "/login", [
        "xynes.com",
      ]);

      expect(result).toBe("/dashboard");
    });

    it("should return default URL for null redirect", () => {
      const result = getPostLogoutRedirectUrl(null, "/login", ["xynes.com"]);

      expect(result).toBe("/login");
    });

    it("should return default URL for undefined redirect", () => {
      const result = getPostLogoutRedirectUrl(undefined, "/login", [
        "xynes.com",
      ]);

      expect(result).toBe("/login");
    });

    it("should handle subdomain matching", () => {
      const result = getPostLogoutRedirectUrl(
        "https://app.staging.xynes.com/dashboard",
        "/login",
        ["xynes.com"]
      );

      expect(result).toBe("https://app.staging.xynes.com/dashboard");
    });

    it("should reject javascript: protocol URLs", () => {
      const result = getPostLogoutRedirectUrl(
        "javascript:alert('xss')",
        "/login",
        ["xynes.com"]
      );

      expect(result).toBe("/login");
    });

    it("should reject data: protocol URLs", () => {
      const result = getPostLogoutRedirectUrl(
        "data:text/html,<script>alert('xss')</script>",
        "/login",
        ["xynes.com"]
      );

      expect(result).toBe("/login");
    });

    it("should reject non-http protocols on allowlisted hosts", () => {
      const result = getPostLogoutRedirectUrl(
        "ftp://cms.xynes.com/dashboard",
        "/login",
        ["xynes.com"]
      );

      expect(result).toBe("/login");
    });
  });

  describe("SUPABASE_COOKIE_PREFIXES", () => {
    it("should export correct Supabase cookie prefixes", () => {
      expect(SUPABASE_COOKIE_PREFIXES).toContain("sb-");
      expect(SUPABASE_COOKIE_PREFIXES).toContain("supabase-auth-token");
    });

    it("should be a non-empty array", () => {
      expect(Array.isArray(SUPABASE_COOKIE_PREFIXES)).toBe(true);
      expect(SUPABASE_COOKIE_PREFIXES.length).toBeGreaterThan(0);
    });
  });

  describe("getCookieClearingOptions", () => {
    describe("in production environment", () => {
      beforeEach(() => {
        vi.stubEnv("NODE_ENV", "production");
      });

      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it("should return secure cookie options for production", () => {
        const options = getCookieClearingOptions(".xynes.com");

        expect(options).toEqual({
          path: "/",
          domain: ".xynes.com",
          secure: true,
          httpOnly: true,
          sameSite: "lax",
          maxAge: 0,
          expires: expect.any(Date),
        });
      });

      it("should set expires to past date", () => {
        const options = getCookieClearingOptions(".xynes.com");

        expect(options.expires.getTime()).toBeLessThan(Date.now());
      });
    });

    describe("in development environment", () => {
      beforeEach(() => {
        vi.stubEnv("NODE_ENV", "development");
      });

      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it("should return non-secure cookie options for development", () => {
        const options = getCookieClearingOptions("localhost");

        expect(options).toMatchObject({
          path: "/",
          domain: "localhost",
          secure: false,
          httpOnly: true,
          sameSite: "lax",
          maxAge: 0,
        });
      });
    });

    it("should handle undefined domain gracefully", () => {
      const options = getCookieClearingOptions(undefined);

      expect(options.domain).toBeUndefined();
    });
  });

  describe("getSupabaseCookieNames", () => {
    it("should identify Supabase auth cookies by prefix", () => {
      const cookieNames = [
        "sb-auth-token",
        "sb-access-token",
        "sb-refresh-token",
        "user_preference",
        "theme",
      ];

      const result = getSupabaseCookieNames(cookieNames);

      expect(result).toContain("sb-auth-token");
      expect(result).toContain("sb-access-token");
      expect(result).toContain("sb-refresh-token");
      expect(result).not.toContain("user_preference");
      expect(result).not.toContain("theme");
    });

    it("should handle empty cookie list", () => {
      const result = getSupabaseCookieNames([]);

      expect(result).toEqual([]);
    });

    it("should handle no matching cookies", () => {
      const result = getSupabaseCookieNames(["theme", "locale", "session_id"]);

      expect(result).toEqual([]);
    });

    it("should match supabase-auth-token prefix", () => {
      const result = getSupabaseCookieNames([
        "supabase-auth-token",
        "supabase-auth-token.0",
        "supabase-auth-token.1",
      ]);

      expect(result).toHaveLength(3);
    });
  });
});
