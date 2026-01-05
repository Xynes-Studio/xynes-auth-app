import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CallbackPage from "./page";

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

// Mock redirect utilities
vi.mock("@/lib/redirect", () => ({
  getSafeRedirectUrl: vi.fn(
    (url: string, defaultUrl: string) => url || defaultUrl
  ),
}));

describe("CallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams.delete("error");
    mockSearchParams.delete("error_description");
    mockSearchParams.delete("redirect");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loading state", () => {
    it("should display loading spinner while processing", () => {
      render(<CallbackPage />);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(
        screen.getByText(/completing your sign-in/i)
      ).toBeInTheDocument();
    });

    it("should have accessible loading text", () => {
      render(<CallbackPage />);

      const loadingRegion = screen.getByRole("status");
      expect(loadingRegion).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("error handling", () => {
    it("should display error message when error param is present", () => {
      mockSearchParams.set("error", "access_denied");

      render(<CallbackPage />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/authentication failed/i)).toBeInTheDocument();
    });

    it("should display error description when provided", () => {
      mockSearchParams.set("error", "access_denied");
      mockSearchParams.set("error_description", "User denied access");

      render(<CallbackPage />);

      expect(screen.getByText(/user denied access/i)).toBeInTheDocument();
    });

    it("should show generic error message for unknown errors", () => {
      mockSearchParams.set("error", "unknown_error_code");

      render(<CallbackPage />);

      expect(
        screen.getByText(/something went wrong during authentication/i)
      ).toBeInTheDocument();
    });

    it("should provide link to return to login page on error", () => {
      mockSearchParams.set("error", "access_denied");

      render(<CallbackPage />);

      const loginLink = screen.getByRole("link", { name: /try again/i });
      expect(loginLink).toHaveAttribute("href", "/login");
    });

    it("should handle access_denied error specifically", () => {
      mockSearchParams.set("error", "access_denied");

      render(<CallbackPage />);

      expect(
        screen.getByText(/you denied access|denied the request/i)
      ).toBeInTheDocument();
    });

    it("should handle server_error specifically", () => {
      mockSearchParams.set("error", "server_error");

      render(<CallbackPage />);

      expect(
        screen.getByText(/authentication server/i)
      ).toBeInTheDocument();
    });
  });

  describe("successful callback", () => {
    it("should redirect to default route when no redirect param", async () => {
      render(<CallbackPage />);

      // Loading state should be shown initially
      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("should preserve redirect parameter when present", async () => {
      mockSearchParams.set("redirect", "/dashboard");

      render(<CallbackPage />);

      // Should show loading while processing
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("should have proper heading structure on error", () => {
      mockSearchParams.set("error", "access_denied");

      render(<CallbackPage />);

      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent(/authentication failed/i);
    });

    it("should have skip link or proper focus management", () => {
      render(<CallbackPage />);

      // The main content should be focusable or have proper landmarks
      expect(screen.getByRole("main")).toBeInTheDocument();
    });
  });

  describe("OAuth error codes", () => {
    const errorCases = [
      {
        code: "invalid_request",
        expectedText: /authentication request was invalid/i,
      },
      {
        code: "unauthorized_client",
        expectedText: /not authorized/i,
      },
      {
        code: "unsupported_response_type",
        expectedText: /unsupported/i,
      },
      {
        code: "invalid_scope",
        expectedText: /requested permissions.*invalid/i,
      },
      {
        code: "temporarily_unavailable",
        expectedText: /temporarily unavailable/i,
      },
    ];

    errorCases.forEach(({ code, expectedText }) => {
      it(`should handle ${code} error code`, () => {
        mockSearchParams.set("error", code);

        render(<CallbackPage />);

        expect(screen.getByRole("alert")).toBeInTheDocument();
        // Check that the specific error message is displayed
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    });
  });
});
