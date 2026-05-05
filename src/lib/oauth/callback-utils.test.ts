import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  bootstrapUser,
  determineRedirectUrl,
  DEFAULT_NEW_USER_REDIRECT,
  DEFAULT_EXISTING_USER_REDIRECT,
  type BootstrapResponse,
} from "./callback-utils";

// Mock fetch for bootstrap API call
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock redirect utilities
vi.mock("@/lib/redirect", () => ({
  getSafeRedirectUrl: vi.fn((url: string, defaultUrl: string) => {
    if (!url) return defaultUrl;
    if (url.startsWith("/") && !url.startsWith("//")) return url;
    // Reject dangerous protocols (mirrors production blocklist).
    const lower = url.toLowerCase().trim();
    if (
      lower.startsWith("javascript:") ||
      lower.startsWith("data:") ||
      lower.startsWith("vbscript:")
    ) {
      return defaultUrl;
    }
    // Properly parse URL and match hostname (anchored), not raw substring.
    // Substring matching like url.includes("xynes.com") is unsafe because
    // attacker URLs such as https://evil.com/?x=xynes.com would slip through.
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return defaultUrl;
      }
      const hostname = parsed.hostname.toLowerCase();
      if (hostname === "xynes.com" || hostname.endsWith(".xynes.com")) {
        return url;
      }
    } catch {
      return defaultUrl;
    }
    return defaultUrl;
  }),
}));

describe("OAuth Callback Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("bootstrapUser", () => {
    it("should return success with hasWorkspaces false for new user", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "u-1", email: "a@b.com", displayName: "Alice" },
            workspaces: [],
          }),
      });

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: true,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      });
    });

    it("should return success with hasWorkspaces true for existing user", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "u-1", email: "a@b.com", displayName: "Alice" },
            workspaces: [{ id: "ws-1", name: "My Workspace" }],
          }),
      });

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: true,
        isNewUser: false,
        hasWorkspaces: true,
        requiresProfileCompletion: false,
      });
    });

    it("should return failure state when API returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: false,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      });
    });

    it("should return failure state when network error occurs", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: false,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      });
    });

    it("should handle missing workspaces array in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "123", email: "a@b.com", displayName: "Alice" },
          }),
      });

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: true,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      });
    });

    it("should send correct authorization header", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "u-1", email: "a@b.com", displayName: "Alice" },
            workspaces: [],
          }),
      });

      await bootstrapUser("my-access-token");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/me"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer my-access-token",
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should handle empty workspaces array", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "u-1", email: "a@b.com", displayName: "Alice" },
            workspaces: [],
          }),
      });

      const result = await bootstrapUser("test-token");

      expect(result.hasWorkspaces).toBe(false);
      expect(result.isNewUser).toBe(true);
    });

    it("should handle multiple workspaces", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "u-1", email: "a@b.com", displayName: "Alice" },
            workspaces: [
              { id: "ws-1", name: "Workspace 1" },
              { id: "ws-2", name: "Workspace 2" },
            ],
          }),
      });

      const result = await bootstrapUser("test-token");

      expect(result.hasWorkspaces).toBe(true);
      expect(result.isNewUser).toBe(false);
    });

    it("should flag profile completion when displayName is missing", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "u-1", email: "a@b.com", displayName: null },
            workspaces: [{ id: "ws-1", name: "Workspace 1" }],
          }),
      });

      const result = await bootstrapUser("test-token");
      expect(result.requiresProfileCompletion).toBe(true);
    });
  });

  describe("determineRedirectUrl", () => {
    const allowedDomains = ["xynes.com", "localhost:3000"];

    it("should return onboarding for new user without redirect param", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl(null, bootstrapResult, allowedDomains);

      expect(result).toBe(DEFAULT_NEW_USER_REDIRECT);
    });

    it("should return workspaces for existing user without redirect param", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: false,
        hasWorkspaces: true,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl(null, bootstrapResult, allowedDomains);

      expect(result).toBe(DEFAULT_EXISTING_USER_REDIRECT);
    });

    it("should ignore dashboard redirect param when provided for new user with no workspaces", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl(
        "/dashboard",
        bootstrapResult,
        allowedDomains
      );

      expect(result).toBe(DEFAULT_NEW_USER_REDIRECT);
    });

    it("should use redirect param when provided for existing user", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: false,
        hasWorkspaces: true,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl(
        "/settings",
        bootstrapResult,
        allowedDomains
      );

      expect(result).toBe("/settings");
    });

    it("should fall back to default when redirect is invalid for new user", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl(
        "https://evil.com",
        bootstrapResult,
        allowedDomains
      );

      // Falls back to default (onboarding for new user)
      expect(result).toBe(DEFAULT_NEW_USER_REDIRECT);
    });

    it("should fall back to default when redirect is invalid for existing user", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: false,
        hasWorkspaces: true,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl(
        "https://malicious.com",
        bootstrapResult,
        allowedDomains
      );

      // Falls back to default (workspaces for existing user)
      expect(result).toBe(DEFAULT_EXISTING_USER_REDIRECT);
    });

    it("should allow external URLs from allowed domains", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: false,
        hasWorkspaces: true,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl(
        "https://cms.xynes.com/dashboard",
        bootstrapResult,
        allowedDomains
      );

      expect(result).toBe("https://cms.xynes.com/dashboard");
    });

    it("should handle bootstrap failure with default redirect", () => {
      const bootstrapResult: BootstrapResponse = {
        success: false,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl(null, bootstrapResult, allowedDomains);

      // Failed bootstrap assumes new user
      expect(result).toBe(DEFAULT_NEW_USER_REDIRECT);
    });

    it("should handle empty redirect param", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: true,
        hasWorkspaces: false,
        requiresProfileCompletion: false,
      };

      const result = determineRedirectUrl("", bootstrapResult, allowedDomains);

      expect(result).toBe(DEFAULT_NEW_USER_REDIRECT);
    });

    it("should prioritize complete-profile redirect when profile is incomplete", () => {
      const bootstrapResult: BootstrapResponse = {
        success: true,
        isNewUser: false,
        hasWorkspaces: true,
        requiresProfileCompletion: true,
      };

      const result = determineRedirectUrl(
        "/dashboard/apps",
        bootstrapResult,
        allowedDomains
      );

      expect(result).toBe("/complete-profile?redirect=%2Fdashboard%2Fapps");
    });
  });

  describe("constants", () => {
    it("should have correct default redirect values", () => {
      expect(DEFAULT_NEW_USER_REDIRECT).toBe("/onboarding");
      expect(DEFAULT_EXISTING_USER_REDIRECT).toBe("/dashboard/apps");
    });
  });
});
