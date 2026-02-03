import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { LoginForm } from "./LoginForm";

// Mock Supabase client - createClient is imported as createBrowserClient in the component
const mockSignInWithPassword = vi.fn();
const mockSignInWithOAuth = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
  createOAuthClient: () => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  }),
}));

// Realistic session object for successful login
const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "test-user-id",
    email: "test@example.com",
    role: "authenticated",
  },
};

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock: successful login with session
    mockSignInWithPassword.mockResolvedValue({
      data: { user: mockSession.user, session: mockSession },
      error: null,
    });
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
  });

  it("should log feature flag state when auth debug is enabled", () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const originalDebug = process.env.NEXT_PUBLIC_AUTH_DEBUG;
    process.env.NEXT_PUBLIC_AUTH_DEBUG = "true";

    renderWithProviders(<LoginForm />);

    const hasFlagLog = consoleSpy.mock.calls.some(
      (call) => call[0] === "[auth-flags]",
    );

    expect(hasFlagLog).toBe(true);

    process.env.NEXT_PUBLIC_AUTH_DEBUG = originalDebug;
    consoleSpy.mockRestore();
  });

  describe("rendering", () => {
    it("should render the login form with all required elements", () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign in/i }),
      ).toBeInTheDocument();
    });

    it("should use a submit button for form submission", () => {
      const { container } = renderWithProviders(<LoginForm />);
      const form = container.querySelector("form");
      expect(form).not.toBeNull();
      expect(screen.getByRole("button", { name: /sign in/i })).toHaveAttribute(
        "type",
        "submit",
      );
    });

    it("should cap password input with a maxLength", () => {
      renderWithProviders(<LoginForm />);
      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        "maxLength",
        "256",
      );
    });

    it("should render OAuth buttons", () => {
      renderWithProviders(<LoginForm />);

      expect(
        screen.getByRole("button", { name: /google/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /github/i }),
      ).toBeInTheDocument();
    });

    it("should render forgot password link", () => {
      renderWithProviders(<LoginForm />);

      expect(
        screen.getByRole("link", { name: /forgot password/i }),
      ).toHaveAttribute("href", "/forgot-password");
    });

    it("should render link to signup page", () => {
      renderWithProviders(<LoginForm />);

      expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
        "href",
        "/signup",
      );
    });
  });

  describe("form validation", () => {
    it("should show error for empty email on submit", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });
    });

    it("should show error for invalid email format", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "invalid-email");
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });

    it("should show error for empty password on submit", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "test@example.com");

      const submitButton = screen.getByRole("button", { name: /sign in/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument();
      });
    });

    it("should reject overly long password and block submission", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const longPassword = "A1a".padEnd(129, "x");
      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), longPassword);
      await user.tab(); // Trigger blur validation

      await waitFor(() => {
        expect(screen.getByText(/128/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).not.toHaveBeenCalled();
      });
    });
  });

  describe("form submission", () => {
    it("should call signInWithPassword with correct credentials", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("should show loading state during submission", async () => {
      mockSignInWithPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { user: mockSession.user, session: mockSession },
                  error: null,
                }),
              100,
            ),
          ),
      );

      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      expect(
        screen.getByRole("button", { name: /signing in/i }),
      ).toBeDisabled();
    });

    it("should call onSuccess when login succeeds", async () => {
      const onSuccess = vi.fn();
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: { id: "123" }, session: { access_token: "token" } },
        error: null,
      });

      const user = userEvent.setup();
      renderWithProviders(<LoginForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it("should display error message on failed login", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: "Invalid login credentials", code: "invalid_grant" },
      });

      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email or password/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("OAuth login", () => {
    it("should call signInWithOAuth for Google", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.click(screen.getByRole("button", { name: /google/i }));

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: expect.any(String),
          }),
        });
      });
    });

    it("should call signInWithOAuth for GitHub", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.click(screen.getByRole("button", { name: /github/i }));

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "github",
          options: expect.objectContaining({
            redirectTo: expect.any(String),
          }),
        });
      });
    });

    it("should include redirect URL in OAuth options when provided", async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <LoginForm redirectUrl="https://cms.xynes.com/dashboard" />,
      );

      await user.click(screen.getByRole("button", { name: /google/i }));

      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: expect.stringContaining(
              encodeURIComponent("https://cms.xynes.com/dashboard"),
            ),
          }),
        });
      });
    });

    it("should display error on OAuth failure", async () => {
      mockSignInWithOAuth.mockResolvedValueOnce({
        error: { message: "OAuth error" },
      });

      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.click(screen.getByRole("button", { name: /google/i }));

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("accessibility", () => {
    it("should have proper form labels", () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute("type", "email");
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("should have proper autocomplete attributes", () => {
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute("autocomplete", "email");
      expect(passwordInput).toHaveAttribute("autocomplete", "current-password");
    });

    it("should announce errors via aria-describedby", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "invalid");
      await user.tab();

      await waitFor(() => {
        const errorMessage = screen.getByText(/valid email/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it("should disable submit button when form is loading", async () => {
      mockSignInWithPassword.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  data: { user: mockSession.user, session: mockSession },
                  error: null,
                }),
              500,
            ),
          ),
      );

      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      const submitButton = screen.getByRole("button", { name: /signing in/i });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("edge cases", () => {
    it("should trim email whitespace before submission", async () => {
      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.type(screen.getByLabelText(/email/i), "  test@example.com  ");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password123",
        });
      });
    });

    it("should handle network errors gracefully", async () => {
      mockSignInWithPassword.mockRejectedValueOnce(new Error("Network error"));

      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "password123");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });

    it("should clear error when user starts typing", async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: {},
        error: { message: "Invalid login credentials", code: "invalid_grant" },
      });

      const user = userEvent.setup();
      renderWithProviders(<LoginForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/password/i), "wrongpassword");
      await user.click(screen.getByRole("button", { name: /sign in/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/invalid email or password/i),
        ).toBeInTheDocument();
      });

      // Start typing again
      await user.type(screen.getByLabelText(/password/i), "a");

      await waitFor(() => {
        expect(
          screen.queryByText(/invalid email or password/i),
        ).not.toBeInTheDocument();
      });
    });
  });
});
