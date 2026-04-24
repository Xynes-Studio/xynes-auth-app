import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";

// Mock next/navigation
const mockReplace = vi.fn();
const mockPush = vi.fn();
let redirectValue: string | null = "https://cms.xynes.com/dashboard";
let errorValue: string | null = null;
const LOGIN_REDIRECT_LOOP_KEY = "xynes_auth_login_redirect_loop";
const LOGIN_REDIRECT_LOOP_WINDOW_MS = 15000;

function setRedirectLoopState(redirectIdentity: string, attempts: number): void {
  window.sessionStorage.setItem(
    LOGIN_REDIRECT_LOOP_KEY,
    JSON.stringify({
      redirectIdentity,
      firstAt: Date.now() - Math.floor(LOGIN_REDIRECT_LOOP_WINDOW_MS / 2),
      attempts,
    }),
  );
}

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn((param) => {
      if (param === "redirect") return redirectValue;
      if (param === "error") return errorValue;
      return null;
    }),
  }),
  usePathname: () => "/login",
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
  }),
}));

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  workspaces: Array<{ slug?: string }>;
  user?: { displayName: string | null } | null;
};

let authState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  workspaces: [],
  user: null,
};

vi.mock("@xynes/auth-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xynes/auth-sdk")>();
  return {
    ...actual,
    useAuth: () => authState,
  };
});

// Mock LoginForm component
vi.mock("@/components/auth/forms/LoginForm", () => ({
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

vi.mock("@/components/auth/layout/AuthSplitLayout", () => ({
  AuthSplitLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-split-layout">{children}</div>
  ),
}));

// Import the component after mocks are set up
import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    window.sessionStorage.clear();
    redirectValue = "https://cms.xynes.com/dashboard";
    errorValue = null;
    authState = {
      isAuthenticated: false,
      isLoading: false,
      workspaces: [],
      user: null,
    };
  });

  describe("rendering", () => {
    it("should render login form after auth loading timeout elapses", async () => {
      vi.useFakeTimers();
      authState = {
        isAuthenticated: false,
        isLoading: true,
        workspaces: [],
        user: null,
      };

      render(<LoginPage />);
      expect(screen.queryByTestId("login-form")).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4100);
      });

      expect(screen.getByTestId("login-form")).toBeInTheDocument();
    });

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

    it("should default redirect URL to dashboard users when redirect param missing", async () => {
      redirectValue = null;
      render(<LoginPage />);

      await waitFor(() => {
        const loginForm = screen.getByTestId("login-form");
        expect(loginForm).toHaveAttribute(
          "data-redirect-url",
          "/dashboard/apps",
        );
      });
    });

    it("should show OAuth error banner and keep login form when error param is present", async () => {
      errorValue = "access_denied";
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
        expect(screen.getByText(/you denied the request/i)).toBeInTheDocument();
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
      });
    });

    it("keeps redirect-loop state when redirect param is present for unauthenticated users", async () => {
      setRedirectLoopState("https://cms.xynes.com/dashboard", 1);
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
      });

      expect(window.sessionStorage.getItem(LOGIN_REDIRECT_LOOP_KEY)).not.toBeNull();
    });

    it("clears redirect-loop state when opening login without redirect param", async () => {
      redirectValue = null;
      setRedirectLoopState("__default__", 1);
      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
      });

      expect(window.sessionStorage.getItem(LOGIN_REDIRECT_LOOP_KEY)).toBeNull();
    });
  });

  describe("navigation", () => {
    it("should redirect successful login with no workspaces to onboarding", async () => {
      const user = userEvent.setup();

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByTestId("mock-login-button")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("mock-login-button"));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/onboarding");
      });
    });
  });

  describe("authenticated redirect", () => {
    it("stops automatic redirect after repeated external redirect loops", async () => {
      setRedirectLoopState("https://cms.xynes.com/dashboard", 2);
      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [{ slug: "ws-1" }],
        user: { displayName: "Alice" },
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(screen.getByTestId("login-form")).toBeInTheDocument();
      });
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it("should redirect authenticated user with 0 workspaces to onboarding", async () => {
      redirectValue = null;
      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [],
        user: { displayName: "Alice" },
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/onboarding");
      });
    });

    it("should redirect authenticated user with 0 workspaces to onboarding even with a CMS redirect", async () => {
      redirectValue = "http://localhost:3000/dashboard/xynes-studio-llp/content";
      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [],
        user: { displayName: "Alice" },
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/onboarding");
      });
    });

    it("should redirect authenticated user with 2+ workspaces to dashboard users", async () => {
      redirectValue = null;
      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [{ slug: "ws-1" }, { slug: "ws-2" }],
        user: { displayName: "Alice" },
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard/apps");
      });
    });

    it("should redirect authenticated user with 1 workspace to dashboard users", async () => {
      redirectValue = null;
      const originalConsoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL;
      process.env.NEXT_PUBLIC_CONSOLE_URL = "https://cms.xynes.com";

      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [{ slug: "My Workspace!" }],
        user: { displayName: "Alice" },
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard/apps");
      });

      process.env.NEXT_PUBLIC_CONSOLE_URL = originalConsoleUrl;
    });

    it("should redirect authenticated user with missing displayName to complete-profile", async () => {
      redirectValue = null;
      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [{ slug: "ws-1" }],
        user: { displayName: null },
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith(
          "/complete-profile?redirect=%2Fdashboard%2Fapps",
        );
      });
    });

    it("should not redirect authenticated user with displayName to complete-profile", async () => {
      redirectValue = "/dashboard/apps";
      authState = {
        isAuthenticated: true,
        isLoading: false,
        workspaces: [{ slug: "ws-1" }],
        user: { displayName: "Alice" },
      };

      render(<LoginPage />);

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith("/dashboard/apps");
      });
      expect(mockReplace).not.toHaveBeenCalledWith(
        "/complete-profile?redirect=%2Fdashboard%2Fapps",
      );
    });
  });
});
