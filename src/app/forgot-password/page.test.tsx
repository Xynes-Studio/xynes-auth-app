import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@/components/auth/layout/AuthSplitLayout", () => ({
  AuthSplitLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-split-layout">{children}</div>
  ),
}));

vi.mock("@/components/auth/forms/ForgotPasswordForm", () => ({
  ForgotPasswordForm: () => <div data-testid="forgot-password-form" />,
}));

vi.mock("@/components/auth/navigation/AuthRouteSwitch", () => ({
  AuthRouteSwitch: ({
    showBackButton,
    backLabel,
  }: {
    showBackButton?: boolean;
    backLabel?: string;
  }) => (
    <div data-testid="auth-route-switch">
      {showBackButton ? <button type="button">{backLabel}</button> : null}
    </div>
  ),
}));

import ForgotPasswordPage from "./page";

describe("ForgotPasswordPage", () => {
  it("should render the forgot password page", async () => {
    render(<ForgotPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/forgot your password/i)).toBeInTheDocument();
      expect(screen.getByTestId("forgot-password-form")).toBeInTheDocument();
    });

    expect(screen.getByTestId("auth-split-layout")).toBeInTheDocument();
    expect(screen.getByTestId("auth-route-switch")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back/i }),
    ).toBeInTheDocument();
  });
});
