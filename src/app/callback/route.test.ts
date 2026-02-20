import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "./route";

/**
 * OAuth Callback Route Integration Tests (Tier 2)
 *
 * Tests the route handler integration with Supabase and bootstrap.
 * Pure function unit tests are in lib/oauth/callback-utils.test.ts (Tier 1).
 *
 * @see ADR-001 Testing Standards
 */

// Mock fetch for bootstrap API call
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Supabase server client
const mockExchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
    },
  }),
}));

// Mock redirect utilities
vi.mock("@/lib/redirect", () => ({
  getSafeRedirectUrl: vi.fn((url: string, defaultUrl: string) => {
    if (!url) return defaultUrl;
    if (url.startsWith("/")) return url;
    if (url.includes("xynes.com")) return url;
    return defaultUrl;
  }),
  getAllowedRedirectDomains: vi.fn(() => ["xynes.com", "localhost:3000"]),
}));

// Mock NextResponse
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    NextResponse: {
      redirect: vi.fn((url: string | URL) => ({
        type: "redirect",
        url: url.toString(),
      })),
    },
  };
});

// Mock session data
const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: { id: "test-user-id", email: "test@example.com" },
};

describe("OAuth Callback Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    // Default: new user with no workspaces
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          user: { id: "test-user-id", email: "test@example.com", displayName: "Test User" },
          workspaces: [],
        }),
    });
  });

  describe("successful OAuth callback", () => {
    it("should exchange code for session when code is present", async () => {
      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
        "valid-auth-code"
      );
    });

    it("should redirect to onboarding for new user after successful code exchange", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "test-user-id", email: "test@example.com", displayName: "Test User" },
            workspaces: [],
          }),
      });

      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/onboarding");
    });

    it("should redirect to workspaces for existing user", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { id: "test-user-id", email: "test@example.com", displayName: "Test User" },
            workspaces: [{ id: "ws-1", name: "Test" }],
          }),
      });

      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/dashboard/apps");
    });

    it("should redirect to custom redirect URL after successful exchange", async () => {
      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code&redirect=/dashboard"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/dashboard");
    });

    it("should redirect to external allowed domain", async () => {
      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code&redirect=https://cms.xynes.com/dashboard"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
    });

    it("should preserve external redirect path and query exactly", async () => {
      const target = "https://cms.xynes.com/acme/content?tab=draft&page=2";
      const request = new Request(
        `http://localhost:3000/callback?code=valid-auth-code&redirect=${encodeURIComponent(target)}`
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalledWith(target);
    });
  });

  describe("failed OAuth callback", () => {
    it("should redirect to login with error when code exchange fails", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: "Invalid code" },
      });

      const request = new Request(
        "http://localhost:3000/callback?code=invalid-code"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/login");
      expect(redirectCall.toString()).toContain("error=auth_callback_error");
    });

    it("should redirect to login with error when no code is present", async () => {
      const request = new Request("http://localhost:3000/callback");

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/login");
      expect(redirectCall.toString()).toContain("error=auth_callback_error");
    });

    it("should redirect to login when session data is missing", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/login");
      expect(redirectCall.toString()).toContain("error=auth_callback_error");
    });
  });

  describe("security", () => {
    it("should validate redirect URL against allowed domains", async () => {
      const request = new Request(
        "http://localhost:3000/callback?code=valid-code&redirect=https://evil.com"
      );

      await GET(request);

      // Should use default redirect instead of evil.com
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).not.toContain("evil.com");
    });

    it("should handle code parameter with special characters safely", async () => {
      const request = new Request(
        "http://localhost:3000/callback?code=test%3Cscript%3E"
      );

      await GET(request);

      // Should call exchange with the decoded value
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test<script>");
    });
  });

  describe("user bootstrap", () => {
    it("should call GET /me to bootstrap user after successful OAuth", async () => {
      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      // Should call the API to bootstrap user
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/me"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockSession.access_token}`,
          }),
        })
      );
    });

    it("should include access token in bootstrap request", async () => {
      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers.Authorization).toBe(
        `Bearer ${mockSession.access_token}`
      );
    });

    it("should continue redirect even if bootstrap fails", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      // Should still redirect despite bootstrap failure
      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/onboarding");
    });

    it("should not call bootstrap when session is missing", async () => {
      mockExchangeCodeForSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      // Should not call bootstrap API
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("OAuth provider errors", () => {
    it("should redirect to login with error when OAuth provider returns error", async () => {
      const request = new Request(
        "http://localhost:3000/callback?error=access_denied"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/login");
      expect(redirectCall.toString()).toContain("error=access_denied");
    });

    it("should not pass error_description to prevent XSS", async () => {
      const request = new Request(
        "http://localhost:3000/callback?error=access_denied&error_description=<script>alert('xss')</script>"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("error=access_denied");
      // Should NOT include error_description (security measure)
      expect(redirectCall.toString()).not.toContain("error_description");
    });

    it("should not call code exchange when error is present", async () => {
      const request = new Request(
        "http://localhost:3000/callback?error=server_error"
      );

      await GET(request);

      // Should not attempt to exchange code
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });

    it("should handle invalid_request error", async () => {
      const request = new Request(
        "http://localhost:3000/callback?error=invalid_request"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("error=invalid_request");
    });

    it("should handle server_error", async () => {
      const request = new Request(
        "http://localhost:3000/callback?error=server_error"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("error=server_error");
    });
  });
});
