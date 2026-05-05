import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isValidRedirectUrl,
  getSafeRedirectUrl,
  buildAuthRedirectUrl,
  getAllowedRedirectDomains,
} from "./index";
describe("Redirect utilities re-exports", () => {
  // Default allowed domains for testing
  const allowedDomains = ["xynes.com", "localhost:3000"];

  describe("isValidRedirectUrl", () => {
    it("should accept relative paths", () => {
      expect(isValidRedirectUrl("/dashboard", allowedDomains)).toBe(true);
      expect(isValidRedirectUrl("/settings/profile", allowedDomains)).toBe(
        true
      );
    });

    it("should reject external URLs not in allowed domains", () => {
      expect(isValidRedirectUrl("https://evil.com", allowedDomains)).toBe(
        false
      );
      expect(isValidRedirectUrl("http://malicious.site", allowedDomains)).toBe(
        false
      );
    });

    it("should reject javascript: protocol", () => {
      expect(isValidRedirectUrl("javascript:alert(1)", allowedDomains)).toBe(
        false
      );
    });

    it("should reject data: protocol", () => {
      expect(
        isValidRedirectUrl("data:text/html,<script>", allowedDomains)
      ).toBe(false);
    });

    it("should reject vbscript: protocol", () => {
      expect(
        isValidRedirectUrl("vbscript:msgbox(1)", allowedDomains)
      ).toBe(false);
      expect(
        isValidRedirectUrl("VBScript:msgbox(1)", allowedDomains)
      ).toBe(false);
      expect(
        isValidRedirectUrl("  vbscript:msgbox(1)  ", allowedDomains)
      ).toBe(false);
    });

    it("should accept allowed domains", () => {
      expect(
        isValidRedirectUrl("https://xynes.com/dashboard", allowedDomains)
      ).toBe(true);
      expect(isValidRedirectUrl("https://cms.xynes.com", allowedDomains)).toBe(
        true
      );
    });

    it("should accept localhost with correct port", () => {
      expect(
        isValidRedirectUrl("http://localhost:3000/app", allowedDomains)
      ).toBe(true);
    });

    it("should reject localhost with wrong port", () => {
      expect(
        isValidRedirectUrl("http://localhost:4000/app", allowedDomains)
      ).toBe(false);
    });

    it("should reject protocol-relative URLs (open redirect vector)", () => {
      expect(isValidRedirectUrl("//evil.com/path", allowedDomains)).toBe(
        false
      );
      expect(isValidRedirectUrl("//xynes.com.evil.com", allowedDomains)).toBe(
        false
      );
    });

    it("should reject non-http protocols even for allowlisted hosts", () => {
      expect(
        isValidRedirectUrl("ftp://cms.xynes.com/dashboard", allowedDomains)
      ).toBe(false);
    });
  });

  describe("getSafeRedirectUrl", () => {
    const defaultUrl = "/";

    it("should return valid relative URLs as-is", () => {
      expect(getSafeRedirectUrl("/dashboard", defaultUrl, allowedDomains)).toBe(
        "/dashboard"
      );
      expect(
        getSafeRedirectUrl("/workspace/123", defaultUrl, allowedDomains)
      ).toBe("/workspace/123");
    });

    it("should return fallback for invalid external URLs", () => {
      expect(
        getSafeRedirectUrl("https://evil.com", defaultUrl, allowedDomains)
      ).toBe(defaultUrl);
      expect(
        getSafeRedirectUrl("javascript:alert(1)", defaultUrl, allowedDomains)
      ).toBe(defaultUrl);
      expect(
        getSafeRedirectUrl("vbscript:msgbox(1)", defaultUrl, allowedDomains)
      ).toBe(defaultUrl);
    });

    it("should use custom fallback when provided", () => {
      expect(
        getSafeRedirectUrl("https://evil.com", "/home", allowedDomains)
      ).toBe("/home");
    });

    it("should return default for null/undefined/empty input", () => {
      expect(
        getSafeRedirectUrl(
          null as unknown as string,
          defaultUrl,
          allowedDomains
        )
      ).toBe(defaultUrl);
      expect(
        getSafeRedirectUrl(
          undefined as unknown as string,
          defaultUrl,
          allowedDomains
        )
      ).toBe(defaultUrl);
      expect(getSafeRedirectUrl("", defaultUrl, allowedDomains)).toBe(
        defaultUrl
      );
    });

    it("should accept allowed domain URLs", () => {
      expect(
        getSafeRedirectUrl(
          "https://cms.xynes.com/dashboard",
          defaultUrl,
          allowedDomains
        )
      ).toBe("https://cms.xynes.com/dashboard");
    });
  });

  describe("buildAuthRedirectUrl", () => {
    const authAppUrl = "https://auth.xynes.com";

    it("should build correct URL with base and path", () => {
      const result = buildAuthRedirectUrl(authAppUrl, "login");
      expect(result).toBe("https://auth.xynes.com/login");
    });

    it("should build signup URL", () => {
      const result = buildAuthRedirectUrl(authAppUrl, "signup");
      expect(result).toBe("https://auth.xynes.com/signup");
    });

    it("should build logout URL", () => {
      const result = buildAuthRedirectUrl(authAppUrl, "logout");
      expect(result).toBe("https://auth.xynes.com/logout");
    });

    it("should preserve redirect parameter", () => {
      const result = buildAuthRedirectUrl(authAppUrl, "login", "/dashboard");
      expect(result).toContain("redirect=");
      expect(result).toContain("%2Fdashboard");
    });

    it("should handle trailing slash in base URL", () => {
      const result = buildAuthRedirectUrl("https://auth.xynes.com/", "login");
      expect(result).toBe("https://auth.xynes.com/login");
    });
  });

  describe("getAllowedRedirectDomains", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      if (typeof originalNodeEnv === "string") {
        vi.stubEnv("NODE_ENV", originalNodeEnv);
      }
    });

    it("prioritizes NEXT_PUBLIC allowlist over non-public env aliases", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS", "A.com,B.com");
      vi.stubEnv("ALLOWED_REDIRECT_DOMAINS", "ignored.com");
      vi.stubEnv("PUBLIC_ALLOWED_REDIRECT_DOMAINS", "ignored-public.com");

      expect(getAllowedRedirectDomains()).toEqual(["xynes.com", "a.com", "b.com"]);
    });

    it("falls back to ALLOWED_REDIRECT_DOMAINS when NEXT_PUBLIC is absent", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS", "");
      vi.stubEnv("ALLOWED_REDIRECT_DOMAINS", "cms.xynes.com");

      expect(getAllowedRedirectDomains()).toEqual(["xynes.com", "cms.xynes.com"]);
    });

    it("falls back to PUBLIC_ALLOWED_REDIRECT_DOMAINS as last source", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS", "");
      vi.stubEnv("ALLOWED_REDIRECT_DOMAINS", "");
      vi.stubEnv("PUBLIC_ALLOWED_REDIRECT_DOMAINS", "console.xynes.com");

      expect(getAllowedRedirectDomains()).toEqual(["xynes.com", "console.xynes.com"]);
    });

    it("normalizes case, de-duplicates, and excludes malformed entries", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv(
        "NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS",
        " Example.com ,example.com,EXAMPLE.com:3000,example.com:3000,https://bad.com,bad.com/path,bad.com?x=1,bad.com#frag,localhost:70000,good-host.com "
      );

      expect(getAllowedRedirectDomains()).toEqual([
        "xynes.com",
        "example.com",
        "example.com:3000",
        "good-host.com",
      ]);
    });
  });
});
