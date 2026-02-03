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

import OAuthClientCallbackPage from "./page";

describe("OAuthClientCallbackPage error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams.error = null;
    mockParams.code = null;
    mockParams.redirect = null;
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
});
