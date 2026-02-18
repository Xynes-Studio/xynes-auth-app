import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import SignupPage from "./page";

const mockSignupSuccess = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
  usePathname: () => "/signup",
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));

vi.mock("@/components/auth/forms/SignupForm", () => ({
  SignupForm: ({
    onSuccess,
  }: {
    onSuccess?: (result: {
      needsEmailVerification: boolean;
      email: string;
    }) => void;
  }) => (
    <div data-testid="signup-form">
      Signup Form
      <button
        type="button"
        onClick={() => {
          onSuccess?.({
            needsEmailVerification: true,
            email: "test@example.com",
          });
          mockSignupSuccess();
        }}
      >
        Trigger Success
      </button>
    </div>
  ),
}));

vi.mock("@/components/auth/layout/AuthSplitLayout", () => ({
  AuthSplitLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-split-layout">{children}</div>
  ),
}));

describe("SignupPage", () => {
  it("uses the shared auth split layout", async () => {
    render(<SignupPage />);

    await waitFor(() => {
      expect(screen.getByTestId("auth-split-layout")).toBeInTheDocument();
    });
  });

  it("renders reusable auth route switch with signup active", async () => {
    render(<SignupPage />);

    await waitFor(() => {
      const loginLink = screen.getByRole("link", { name: /log in/i });
      const signupLink = screen.getByRole("link", { name: /sign up/i });

      expect(loginLink).toHaveAttribute("href", "/login");
      expect(signupLink).toHaveAttribute("href", "/signup");
      expect(signupLink).toHaveAttribute("aria-current", "page");
      expect(loginLink).not.toHaveAttribute("aria-current");
    });
  });

  it("renders signup form", async () => {
    render(<SignupPage />);

    await waitFor(() => {
      expect(screen.getByTestId("signup-form")).toBeInTheDocument();
    });
  });

  it("redirects to verify-email when signup needs email verification", async () => {
    const originalLocation = window.location;
    const mockLocation = { href: "" };
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });

    render(<SignupPage />);

    fireEvent.click(screen.getByRole("button", { name: /trigger success/i }));

    await waitFor(() => {
      expect(mockSignupSuccess).toHaveBeenCalled();
      expect(mockLocation.href).toContain("/verify-email");
      expect(mockLocation.href).toContain("email=test%40example.com");
    });

    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });
});
