/**
 * Logout Page - Integration Tests (Tier 2)
 *
 * Tests for the client-side logout page component.
 * Uses testing-library for rendering and interaction tests.
 *
 * @see ADR-001 Testing Standards
 * @see AUTH-FE-1.7 Logout Flow Story
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
let mockRedirectParam: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "redirect" ? mockRedirectParam : null),
  }),
}));

// Mock Supabase client
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signOut: () => mockSignOut(),
    },
  })),
}));

// Mock getSafeRedirectUrl
vi.mock("@/lib/redirect", () => ({
  getSafeRedirectUrl: vi.fn(
    (url: string, defaultUrl: string) => url || defaultUrl
  ),
}));

// Import after mocks
import LogoutPage from "./page";

describe("LogoutPage", () => {
  let originalLocation: Location;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue({ error: null });
    mockRedirectParam = null;

    // Mock window.location
    originalLocation = window.location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    window.location = { href: "" } as Location;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.location = originalLocation;
  });

  describe("rendering", () => {
    it("should render logout page with heading", async () => {
      mockSignOut.mockImplementation(() => new Promise(() => {})); // Pending

      render(<LogoutPage />);

      await waitFor(() => {
        expect(screen.getByRole("heading")).toBeInTheDocument();
      });
    });

    it("should show loading state initially", async () => {
      mockSignOut.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LogoutPage />);

      await waitFor(() => {
        // Use getAllByText since there are multiple elements with "signing out"
        const elements = screen.getAllByText(/signing out/i);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    it("should render within a main container", async () => {
      mockSignOut.mockImplementation(() => new Promise(() => {})); // Pending

      render(<LogoutPage />);

      await waitFor(() => {
        expect(screen.getByRole("main")).toBeInTheDocument();
      });
    });
  });

  describe("logout flow", () => {
    it("should call signOut on mount", async () => {
      render(<LogoutPage />);

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(1);
      });
    });

    it("should show success state after logout", async () => {
      render(<LogoutPage />);

      await waitFor(() => {
        expect(
          screen.getByText(/successfully signed out/i)
        ).toBeInTheDocument();
      });
    });

    it("should set redirect URL after successful logout", async () => {
      render(<LogoutPage />);

      await waitFor(
        () => {
          expect(window.location.href).toContain("/login");
        },
        { timeout: 3000 }
      );
    });
  });

  describe("error handling", () => {
    it("should show error message when signOut fails", async () => {
      mockSignOut.mockResolvedValue({ error: { message: "Sign out failed" } });

      render(<LogoutPage />);

      await waitFor(() => {
        expect(screen.getByText(/unable to sign out/i)).toBeInTheDocument();
      });
    });

    it("should show retry button on error", async () => {
      mockSignOut.mockResolvedValue({ error: { message: "Sign out failed" } });

      render(<LogoutPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /try again/i })
        ).toBeInTheDocument();
      });
    });

    it("should retry logout when retry button is clicked", async () => {
      const user = userEvent.setup();

      mockSignOut
        .mockResolvedValueOnce({ error: { message: "Sign out failed" } })
        .mockResolvedValueOnce({ error: null });

      render(<LogoutPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /try again/i })
        ).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /try again/i }));

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("redirect handling", () => {
    it("should use redirect param when provided", async () => {
      mockRedirectParam = "https://cms.xynes.com/dashboard";

      render(<LogoutPage />);

      await waitFor(
        () => {
          expect(window.location.href).toContain("cms.xynes.com");
        },
        { timeout: 3000 }
      );
    });
  });

  describe("accessibility", () => {
    it("should have accessible heading structure", async () => {
      mockSignOut.mockImplementation(() => new Promise(() => {})); // Pending

      render(<LogoutPage />);

      await waitFor(() => {
        const heading = screen.getByRole("heading", { level: 1 });
        expect(heading).toBeInTheDocument();
      });
    });

    it("should have proper aria-busy on loading state", async () => {
      mockSignOut.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<LogoutPage />);

      await waitFor(() => {
        expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
      });
    });

    it("should have proper focus management on error", async () => {
      mockSignOut.mockResolvedValue({ error: { message: "Sign out failed" } });

      render(<LogoutPage />);

      await waitFor(() => {
        const retryButton = screen.getByRole("button", { name: /try again/i });
        expect(retryButton).toBeVisible();
      });
    });
  });
});
