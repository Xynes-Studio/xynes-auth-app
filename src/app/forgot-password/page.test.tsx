import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

vi.mock("@/components/auth/forms/ForgotPasswordForm", () => ({
  ForgotPasswordForm: () => <div data-testid="forgot-password-form" />,
}));

import ForgotPasswordPage from "./page";

describe("ForgotPasswordPage", () => {
  it("should render the forgot password page", async () => {
    render(<ForgotPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
      expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /back to login/i }),
    ).toHaveAttribute("href", "/login");
  });
});
