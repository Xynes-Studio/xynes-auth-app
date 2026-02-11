import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "./SignupForm";

// Mock Supabase client
const mockSignUp = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signUp: mockSignUp,
    },
  }),
}));

vi.mock("@xynes/auth-sdk", () => ({
  useOAuthProviders: () => ({ google: true, github: true }),
  useFeatureFlags: () => ({ flags: {}, isLoading: false, error: null }),
  normalizeAuthError: (error: { message?: string } | null) => ({
    message: error?.message ?? "Unknown error",
  }),
  getPasswordStrength: (password: string) => {
    if (
      password.length >= 12 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    ) {
      return "strong";
    }
    if (password.length >= 8) {
      return "medium";
    }
    return "weak";
  },
  PASSWORD_STRENGTH_CONFIG: {
    weak: { label: "Weak", color: "text-red-600", percentage: 25 },
    medium: { label: "Medium", color: "text-yellow-600", percentage: 60 },
    strong: { label: "Strong", color: "text-green-600", percentage: 100 },
  },
}));

vi.mock("../ui", async () => {
  const actual = await vi.importActual<typeof import("../ui")>("../ui");
  return {
    ...actual,
    OAuthButtons: ({ redirectUrl }: { redirectUrl?: string }) => (
      <div data-testid="oauth-buttons" data-redirect-url={redirectUrl} />
    ),
  };
});

describe("SignupForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignUp.mockResolvedValue({ data: {}, error: null });
  });

  describe("rendering", () => {
    it("should render the signup form", () => {
      render(<SignupForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create account/i }),
      ).toBeInTheDocument();
    });

    it("should cap password inputs with a maxLength", () => {
      render(<SignupForm />);

      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
        "maxLength",
        "256",
      );
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute(
        "maxLength",
        "256",
      );
    });

    it("should render OAuth buttons", () => {
      render(<SignupForm />);

      expect(screen.getByTestId("oauth-buttons")).toBeInTheDocument();
    });

    it("should render link to login page", () => {
      render(<SignupForm />);

      expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
        "href",
        "/login",
      );
    });
  });

  describe("form validation", () => {
    it("should show error for invalid email", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const emailInput = screen.getByLabelText(/email/i);
      await user.type(emailInput, "invalid-email");
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeInTheDocument();
      });
    });

    it("should show error for short password", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, "short");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
      });
    });

    it("should show error for mismatched passwords", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      await user.type(passwordInput, "ValidPass123!");
      await user.type(confirmInput, "DifferentPass123!");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });
    });

    it("should reject overly long password with inline validation and block submission", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const longPassword = "A1a".padEnd(129, "x");
      await user.type(screen.getByLabelText(/^password$/i), longPassword);
      await user.type(screen.getByLabelText(/confirm password/i), longPassword);
      await user.tab(); // Trigger blur validation

      await waitFor(() => {
        expect(
          screen.getAllByText(/password must be at most 128 characters/i),
        ).toHaveLength(2);
      });

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUp).not.toHaveBeenCalled();
      });
    });
  });

  describe("password strength indicator", () => {
    it("should show password strength indicator when typing", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, "weak");

      expect(screen.getByText(/password strength/i)).toBeInTheDocument();
      expect(screen.getByText(/weak/i)).toBeInTheDocument();
    });

    it("should update strength indicator for strong password", async () => {
      const user = userEvent.setup();
      render(<SignupForm />);

      const passwordInput = screen.getByLabelText(/^password$/i);
      await user.type(passwordInput, "StrongPass123!");

      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });
  });

  describe("form submission", () => {
    it("should use POST method to avoid leaking credentials in URL", () => {
      const { container } = render(<SignupForm />);
      const form = container.querySelector("form");
      expect(form).toBeTruthy();
      expect(form).toHaveAttribute("method", "post");
    });

    it("should call onSuccess when signup succeeds with email verification", async () => {
      const onSuccess = vi.fn();
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: "123" }, session: null },
        error: null,
      });

      const user = userEvent.setup();
      render(<SignupForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "ValidPass123!");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "ValidPass123!",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(mockSignUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "ValidPass123!",
          options: expect.objectContaining({
            emailRedirectTo: expect.stringContaining("/callback"),
          }),
        });
        expect(onSuccess).toHaveBeenCalledWith(true);
      });
    });

    it("should call onSuccess with false when signup creates session directly", async () => {
      const onSuccess = vi.fn();
      mockSignUp.mockResolvedValueOnce({
        data: { user: { id: "123" }, session: { access_token: "token" } },
        error: null,
      });

      const user = userEvent.setup();
      render(<SignupForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "ValidPass123!");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "ValidPass123!",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith(false);
      });
    });

    it("should show error when signup fails", async () => {
      mockSignUp.mockResolvedValueOnce({
        data: {},
        error: {
          message: "User already registered",
          code: "user_already_exists",
        },
      });

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "ValidPass123!");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "ValidPass123!",
      );
      await user.click(screen.getByRole("button", { name: /create account/i }));

      await waitFor(() => {
        expect(screen.getByText(/signup failed/i)).toBeInTheDocument();
      });
    });

    it("should disable submit button while loading", async () => {
      mockSignUp.mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 1000)),
      );

      const user = userEvent.setup();
      render(<SignupForm />);

      await user.type(screen.getByLabelText(/email/i), "test@example.com");
      await user.type(screen.getByLabelText(/^password$/i), "ValidPass123!");
      await user.type(
        screen.getByLabelText(/confirm password/i),
        "ValidPass123!",
      );

      const submitButton = screen.getByRole("button", {
        name: /create account/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /creating account/i }),
        ).toBeDisabled();
      });
    });
  });

  describe("OAuth signup", () => {
    it("should pass redirectUrl to OAuthButtons", () => {
      render(<SignupForm redirectUrl="https://app.xynes.com/dashboard" />);

      const oauthButtons = screen.getByTestId("oauth-buttons");
      expect(oauthButtons).toHaveAttribute(
        "data-redirect-url",
        "https://app.xynes.com/dashboard",
      );
    });
  });
});
