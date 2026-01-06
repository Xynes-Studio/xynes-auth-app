/**
 * Logout Route Handler - Integration Tests (Tier 2)
 *
 * Tests the logout route handler integration with Supabase and cookie clearing.
 * Pure function unit tests are in lib/logout/logout-utils.test.ts (Tier 1).
 *
 * @see ADR-001 Testing Standards
 * @see AUTH-FE-1.7 Logout Flow Story
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Supabase server client
const mockSignOut = vi.fn();
const mockGetAll = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        signOut: () => mockSignOut(),
      },
    })
  ),
}));

// Mock cookies from next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: () => mockGetAll(),
      set: (...args: unknown[]) => mockSet(...args),
      delete: (...args: unknown[]) => mockDelete(...args),
    })
  ),
}));

// Mock redirect utilities
vi.mock("@/lib/redirect", () => ({
  isValidRedirectUrl: vi.fn((url: string, domains: string[]) => {
    if (!url) return false;
    if (url.startsWith("/") && !url.startsWith("//")) return true;
    // Reject dangerous protocols
    const lower = url.toLowerCase();
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) return false;
    return domains.some(
      (d) => url.includes(d) || url.includes(d.replace(":", ""))
    );
  }),
  getSafeRedirectUrl: vi.fn((url: string, defaultUrl: string, domains: string[]) => {
    if (!url) return defaultUrl;
    if (url.startsWith("/") && !url.startsWith("//")) return url;
    // Reject dangerous protocols
    const lower = url.toLowerCase();
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) return defaultUrl;
    if (lower.startsWith("//")) return defaultUrl; // Protocol-relative URLs
    const isValid = domains.some(
      (d) => url.includes(d) || url.includes(d.replace(":", ""))
    );
    return isValid ? url : defaultUrl;
  }),
  getAllowedRedirectDomains: vi.fn(() => ["xynes.com", "localhost:3000"]),
}));

// Import after mocks
import { POST, GET } from "./route";

// Helper to create mock request
function createMockRequest(
  method: string,
  url: string,
  options?: RequestInit
): Request {
  return new Request(url, { method, ...options });
}

describe("Logout Route Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    mockGetAll.mockReturnValue([
      { name: "sb-auth-token", value: "token123" },
      { name: "sb-refresh-token", value: "refresh456" },
      { name: "theme", value: "dark" },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST handler", () => {
    it("should sign out from Supabase", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout"
      );

      await POST(request);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it("should clear Supabase auth cookies", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout"
      );

      await POST(request);

      // Should delete Supabase cookies (sb- prefixed)
      expect(mockDelete).toHaveBeenCalled();
      const deleteCalls = mockDelete.mock.calls.map((call) => call[0]);
      expect(deleteCalls).toContain("sb-auth-token");
      expect(deleteCalls).toContain("sb-refresh-token");
    });

    it("should not clear non-auth cookies", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout"
      );

      await POST(request);

      const deleteCalls = mockDelete.mock.calls.map((call) => call[0]);
      expect(deleteCalls).not.toContain("theme");
    });

    it("should redirect to login page by default", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout"
      );

      const response = await POST(request);

      // NextResponse.redirect uses 307 by default
      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe("http://localhost:3000/login");
    });

    it("should redirect to valid external URL when provided", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout?redirect=https://cms.xynes.com/dashboard"
      );

      const response = await POST(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe(
        "https://cms.xynes.com/dashboard"
      );
    });

    it("should reject invalid redirect URLs", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout?redirect=https://malicious.com"
      );

      const response = await POST(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe("http://localhost:3000/login");
    });

    it("should handle relative redirect URLs", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout?redirect=/dashboard"
      );

      const response = await POST(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe(
        "http://localhost:3000/dashboard"
      );
    });

    it("should handle Supabase signOut errors gracefully", async () => {
      mockSignOut.mockRejectedValue(new Error("Network error"));

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout"
      );

      // Should still redirect even if signOut fails
      const response = await POST(request);

      expect(response.status).toBe(307);
      // Still clear cookies on client side even if Supabase call fails
      expect(mockDelete).toHaveBeenCalled();
    });

    it("should handle cookies that throw on delete", async () => {
      mockDelete.mockImplementation((name: string) => {
        if (name === "sb-auth-token") {
          throw new Error("Cookie delete failed");
        }
      });

      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout"
      );

      // Should not throw, should handle gracefully
      const response = await POST(request);

      expect(response.status).toBe(307);
    });
  });

  describe("GET handler", () => {
    it("should perform logout and redirect", async () => {
      const request = createMockRequest(
        "GET",
        "http://localhost:3000/logout"
      );

      const response = await GET(request);

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(307);
    });

    it("should support redirect parameter via GET", async () => {
      const request = createMockRequest(
        "GET",
        "http://localhost:3000/logout?redirect=https://cms.xynes.com/dashboard"
      );

      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("Location")).toBe("https://cms.xynes.com/dashboard");
    });
  });

  describe("security", () => {
    it("should reject javascript: protocol in redirect", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout?redirect=javascript:alert('xss')"
      );

      const response = await POST(request);

      expect(response.headers.get("Location")).toBe("http://localhost:3000/login");
    });

    it("should reject data: protocol in redirect", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout?redirect=data:text/html,<script>alert('xss')</script>"
      );

      const response = await POST(request);

      expect(response.headers.get("Location")).toBe("http://localhost:3000/login");
    });

    it("should reject protocol-relative URLs", async () => {
      const request = createMockRequest(
        "POST",
        "http://localhost:3000/logout?redirect=//malicious.com"
      );

      const response = await POST(request);

      expect(response.headers.get("Location")).toBe("http://localhost:3000/login");
    });
  });
});
