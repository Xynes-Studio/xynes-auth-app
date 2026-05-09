import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// Mock next/navigation
const mockParams = {
  error: null as string | null,
  code: null as string | null,
  redirect: null as string | null,
};

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "error") return mockParams.error;
      if (key === "code") return mockParams.code;
      if (key === "redirect") return mockParams.redirect;
      return null;
    },
  }),
}));

// Mock Supabase client
const mockExchangeCodeForSession = vi.fn();
const mockSetSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: (...args: unknown[]) =>
        mockExchangeCodeForSession(...args),
      setSession: (...args: unknown[]) => mockSetSession(...args),
    },
  })),
}));

// Mock redirect utils
vi.mock("@/lib/redirect", () => ({
  getAllowedRedirectDomains: vi.fn(() => ["xynes.com", "localhost:3000"]),
  getSafeRedirectUrl: vi.fn(
    (url: string, defaultUrl: string) => url || defaultUrl,
  ),
}));

const mockReadPersistedOAuthRedirect = vi.fn();
const mockClearPersistedOAuthRedirect = vi.fn();
const mockResolveOAuthRedirect = vi.fn((...args: unknown[]) => {
  const [redirect, stored, fallback] = args as [
    string | null,
    string | null,
    string,
  ];
  return redirect || stored || fallback;
});

vi.mock("@/lib/redirect/storage", () => ({
  readPersistedOAuthRedirect: (...args: unknown[]) =>
    mockReadPersistedOAuthRedirect(...args),
  clearPersistedOAuthRedirect: (...args: unknown[]) =>
    mockClearPersistedOAuthRedirect(...args),
  resolveOAuthRedirect: (...args: unknown[]) =>
    mockResolveOAuthRedirect(...args),
}));

import OAuthClientCallbackPage from "./page";

describe("OAuthClientCallbackPage error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.error = null;
    mockParams.code = null;
    mockParams.redirect = null;
    mockReadPersistedOAuthRedirect.mockReturnValue(null);
  });

  it("shows provider cancellation error when error param is present", async () => {
    mockParams.error = "access_denied";

    render(<OAuthClientCallbackPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/unable to complete sign-in/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows safe fallback actions when exchange fails", async () => {
    mockParams.code = "bad-code";
    mockExchangeCodeForSession.mockResolvedValue({
      data: null,
      error: { message: "Invalid code" },
    });

    render(<OAuthClientCallbackPage />);

    await waitFor(() => {
      expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
      expect(
        screen.getByRole("button", { name: /go to login/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /contact support/i }),
      ).toBeInTheDocument();
    });
  });

  it("clears stored redirect on error", async () => {
    mockParams.error = "access_denied";

    render(<OAuthClientCallbackPage />);

    await waitFor(() => {
      expect(mockClearPersistedOAuthRedirect).toHaveBeenCalled();
    });
  });

  it("clears stored redirect and hash before redirecting", async () => {
    mockParams.code = "good-code";
    mockReadPersistedOAuthRedirect.mockReturnValue("/invite/test");
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });

    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "";

    const originalLocation = window.location;
    const mockLocation = {
      href: "",
      hash: "#access_token=abc&refresh_token=def",
      pathname: "/callback/client",
      search: "",
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });

    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(<OAuthClientCallbackPage />);

    await waitFor(() => {
      expect(mockClearPersistedOAuthRedirect).toHaveBeenCalled();
      expect(replaceStateSpy).toHaveBeenCalled();
      expect(mockLocation.href).toBe("/invite/test");
    });

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    replaceStateSpy.mockRestore();
  });

  it("redirects existing users to dashboard users by default", async () => {
    mockParams.code = "good-code";
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "user-1",
            email: "user-1@example.com",
            displayName: "User One",
          },
          workspaces: [{ id: "ws-1" }, { id: "ws-2" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4100";

    const originalLocation = window.location;
    const mockLocation = {
      href: "",
      hash: "",
      pathname: "/callback/client",
      search: "",
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });

    render(<OAuthClientCallbackPage />);

    await waitFor(() => {
      expect(mockResolveOAuthRedirect).toHaveBeenCalledWith(
        null,
        null,
        "/dashboard/apps",
        ["xynes.com", "localhost:3000"],
      );
    });

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });

  it("stores first workspace as default when no previous selection exists", async () => {
    mockParams.code = "good-code";
    mockReadPersistedOAuthRedirect.mockReturnValue(null);
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "user-1",
            email: "user-1@example.com",
            displayName: "User One",
          },
          workspaces: [{ id: "ws-first" }, { id: "ws-second" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4100";
    window.localStorage.removeItem("xynes_workspace_id");

    const originalLocation = window.location;
    const mockLocation = {
      href: "",
      hash: "",
      pathname: "/callback/client",
      search: "",
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });

    render(<OAuthClientCallbackPage />);

    await waitFor(() => {
      expect(window.localStorage.getItem("xynes_workspace_id")).toBe(
        "ws-first",
      );
    });

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });

  it("redirects to complete-profile when OAuth user has no displayName", async () => {
    mockParams.code = "good-code";
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user: {
            id: "user-1",
            email: "user-1@example.com",
            displayName: null,
          },
          workspaces: [{ id: "ws-1" }],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4100";

    const originalLocation = window.location;
    const mockLocation = {
      href: "",
      hash: "",
      pathname: "/callback/client",
      search: "",
    };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });

    render(<OAuthClientCallbackPage />);

    const expectedRedirect = "/dashboard/apps";
    const expectedLocation = `/complete-profile?redirect=${encodeURIComponent(expectedRedirect)}`;

    await waitFor(() => {
      expect(mockLocation.href).toBe(expectedLocation);
    });

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
    process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });
});
