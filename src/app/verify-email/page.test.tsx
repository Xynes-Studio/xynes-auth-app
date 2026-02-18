import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const mockParams = {
  email: "test@example.com",
  redirect: "/dashboard/apps",
};

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      if (key === "email") return mockParams.email;
      if (key === "redirect") return mockParams.redirect;
      return null;
    },
  }),
}));

vi.mock("@/components/auth/layout/AuthSplitLayout", () => ({
  AuthSplitLayout: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-split-layout">{children}</div>
  ),
}));

vi.mock("@/components/auth/navigation/AuthRouteSwitch", () => ({
  AuthRouteSwitch: () => <div data-testid="auth-route-switch" />,
}));

vi.mock("@/components/auth/forms/VerifyEmailForm", () => ({
  VerifyEmailForm: () => <div data-testid="verify-email-form" />,
}));

import VerifyEmailPage from "./page";

describe("VerifyEmailPage", () => {
  it("renders verify email content and form", async () => {
    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /verify your email/i }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("verify-email-form")).toBeInTheDocument();
    });

    expect(screen.getByTestId("auth-split-layout")).toBeInTheDocument();
    expect(screen.getByTestId("auth-route-switch")).toBeInTheDocument();
  });
});
