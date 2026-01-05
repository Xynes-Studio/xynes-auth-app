import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";
import { GET } from "./route";
import {
  bootstrapUser,
  determineRedirectUrl,
} from "@/lib/oauth/callback-utils";

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
      json: () => Promise.resolve({ workspaces: [] }),
    });
  });

  describe("bootstrapUser", () => {
    it("should return success with hasWorkspaces false for new user", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ workspaces: [] }),
      });

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: true,
        isNewUser: true,
        hasWorkspaces: false,
      });
    });

    it("should return success with hasWorkspaces true for existing user", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            workspaces: [{ id: "ws-1", name: "My Workspace" }],
          }),
      });

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: true,
        isNewUser: false,
        hasWorkspaces: true,
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
      });
    });

    it("should return failure state when network error occurs", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: false,
        isNewUser: true,
        hasWorkspaces: false,
      });
    });

    it("should handle missing workspaces array in response", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ user: { id: "123" } }),
      });

      const result = await bootstrapUser("test-token");

      expect(result).toEqual({
        success: true,
        isNewUser: true,
        hasWorkspaces: false,
      });
    });
  });

  describe("determineRedirectUrl", () => {
    const allowedDomains = ["xynes.com", "localhost:3000"];

    it("should return onboarding for new user without redirect param", () => {
      const result = determineRedirectUrl(
        null,
        { success: true, isNewUser: true, hasWorkspaces: false },
        allowedDomains
      );

      expect(result).toBe("/onboarding");
    });

    it("should return workspaces for existing user without redirect param", () => {
      const result = determineRedirectUrl(
        null,
        { success: true, isNewUser: false, hasWorkspaces: true },
        allowedDomains
      );

      expect(result).toBe("/workspaces");
    });

    it("should use redirect param when provided", () => {
      const result = determineRedirectUrl(
        "/dashboard",
        { success: true, isNewUser: true, hasWorkspaces: false },
        allowedDomains
      );

      expect(result).toBe("/dashboard");
    });

    it("should fall back to default when redirect is invalid", () => {
      const result = determineRedirectUrl(
        "https://evil.com",
        { success: true, isNewUser: true, hasWorkspaces: false },
        allowedDomains
      );

      // Falls back to default (onboarding for new user)
      expect(result).toBe("/onboarding");
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
        json: () => Promise.resolve({ workspaces: [] }),
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
          Promise.resolve({ workspaces: [{ id: "ws-1", name: "Test" }] }),
      });

      const request = new Request(
        "http://localhost:3000/callback?code=valid-auth-code"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("/workspaces");
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

    it("should include error_description when provider provides it", async () => {
      const request = new Request(
        "http://localhost:3000/callback?error=access_denied&error_description=User%20cancelled"
      );

      await GET(request);

      expect(NextResponse.redirect).toHaveBeenCalled();
      const redirectCall = vi.mocked(NextResponse.redirect).mock.calls[0][0];
      expect(redirectCall.toString()).toContain("error=access_denied");
      // URL encoding may use + or %20 for spaces
      expect(redirectCall.toString()).toMatch(/error_description=User[+%20]cancelled/);
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
