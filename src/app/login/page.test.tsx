import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockPush = vi.fn();
let redirectValue: string | null = "https://cms.xynes.com/dashboard";
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn((param) => {
      if (param === "redirect") return redirectValue;
      return null;
    }),
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock LoginForm component
vi.mock("@/components/LoginForm", () => ({
  LoginForm: ({ onSuccess, redirectUrl }: { onSuccess?: () => void; redirectUrl?: string }) => (
    <div data-testid="login-form" data-redirect-url={redirectUrl}>
      <button
        data-testid="mock-login-button"
        onClick={() => onSuccess?.()}
      >
        Mock Login
      </button>
    </div>
  ),
}));

// Mock getSafeRedirectUrl
vi.mock("@/lib/redirect", () => ({
  getSafeRedirectUrl: vi.fn((url, defaultUrl) => url || defaultUrl),
}));

// Import the component after mocks are set up
import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectValue = "https://cms.xynes.com/dashboard";
  });

  describe("rendering", () => {
    it("should render the login page with correct heading", async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
        expect(screen.getByText(/sign in to your account/i)).toBeInTheDocument();
      });
    });

    it("should render the login form", async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
      });
    });

    it("should pass redirect URL to LoginForm", async () => {
      render(<LoginPage />);

      await waitFor(() => {
        const loginForm = screen.getByTestId("login-form");
        expect(loginForm).toHaveAttribute(
          "data-redirect-url",
          "https://cms.xynes.com/dashboard"
        );
      });
    });

    it("should default redirect URL to workspaces when redirect param missing", async () => {
      redirectValue = null;
      render(<LoginPage />);

      await waitFor(() => {
        const loginForm = screen.getByTestId("login-form");
        expect(loginForm).toHaveAttribute("data-redirect-url", "/workspaces");
      });
    });
  });

  describe("navigation", () => {
    it("should redirect on successful login", async () => {
      const user = userEvent.setup();
      
      // Mock window.location
      const originalLocation = window.location;
      const mockLocation = { href: "" };
      Object.defineProperty(window, "location", {
        value: mockLocation,
        writable: true,
      });

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByTestId("mock-login-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("mock-login-button"));

      await waitFor(() => {
        expect(mockLocation.href).toBe("https://cms.xynes.com/dashboard");
      });

      // Restore
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
      });
    });
  });
});
