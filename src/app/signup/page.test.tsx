import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import SignupPage from "./page";

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
  SignupForm: () => <div data-testid="signup-form">Signup Form</div>,
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
});
