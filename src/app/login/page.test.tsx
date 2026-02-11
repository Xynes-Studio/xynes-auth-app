import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock next/navigation
const mockReplace = vi.fn();
const mockPush = vi.fn();
let redirectValue: string | null = "https://cms.xynes.com/dashboard";
let errorValue: string | null = null;
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn((param) => {
      if (param === "redirect") return redirectValue;
      if (param === "error") return errorValue;
      return null;
    }),
  }),
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  workspaces: Array<{ slug?: string }>;
};

let authState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  workspaces: [],
};

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => authState,
}));

// Mock LoginForm component
vi.mock("@/components/auth/LoginForm", () => ({
  LoginForm: ({
    onSuccess,
    redirectUrl,
  }: {
    onSuccess?: () => void;
    redirectUrl?: string;
  }) => (
    <div data-testid="login-form" data-redirect-url={redirectUrl}>
      <button data-testid="mock-login-button" onClick={() => onSuccess?.()}>
        Mock Login
      </button>
    </div>
  ),
}));

// Import the component after mocks are set up
import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectValue = "https://cms.xynes.com/dashboard";
    errorValue = null;
    authState = {
      isAuthenticated: false,
      isLoading: false,
      workspaces: [],
    };
  });

  describe("rendering", () => {
    it("should render the login page with correct heading", async () => {
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
          "href",
          "/login",
        );
        expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
          "href",
          "/signup",
        );
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
          "https://cms.xynes.com/dashboard",
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

    it("should show OAuth error banner when error param is present", async () => {
      errorValue = "access_denied";
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
        expect(screen.getByText(/you denied the request/i)).toBeInTheDocument();
      });
    });
  });

  describe("navigation", () => {
    it("should redirect on successful login", async () => {
      const user = userEvent.setup();

      // Mock window.location
      const originalLocation = window.location;
      const assign = vi.fn();
      const mockLocation = { href: "", assign };
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
        expect(assign).toHaveBeenCalledWith("https://cms.xynes.com/dashboard");
      });

      // Restore
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
      });
    });
  });

  describe("authenticated redirect", () => {
    it("should redirect authenticated user with 0 workspaces to onboarding", async () => {
      redirectValue = null;
      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [],
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/onboarding");
      });
    });

    it("should redirect authenticated user with 2+ workspaces to selector", async () => {
      redirectValue = null;
      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [{ slug: "ws-1" }, { slug: "ws-2" }],
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/workspaces");
      });
    });

    it("should redirect authenticated user with 1 workspace to console when configured", async () => {
      redirectValue = null;
      const originalConsoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL;
      process.env.NEXT_PUBLIC_CONSOLE_URL = "https://cms.xynes.com";

      // Mock window.location.assign
      const originalLocation = window.location;
      const assign = vi.fn();
      Object.defineProperty(window, "location", {
        value: { ...originalLocation, assign },
        writable: true,
      });

      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [{ slug: "My Workspace!" }],
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(assign).toHaveBeenCalledWith(
          "https://cms.xynes.com/myworkspace",
        );
      });

      process.env.NEXT_PUBLIC_CONSOLE_URL = originalConsoleUrl;
      Object.defineProperty(window, "location", {
        value: originalLocation,
        writable: true,
      });
    });
  });
});
