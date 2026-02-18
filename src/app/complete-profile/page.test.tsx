import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const mockParams = {
  redirect: "/dashboard/apps",
};

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
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

vi.mock("@/components/auth/forms/CompleteProfileForm", () => ({
  CompleteProfileForm: () => <div data-testid="complete-profile-form" />,
}));

import CompleteProfilePage from "./page";

describe("CompleteProfilePage", () => {
  it("renders complete profile content and form", async () => {
    render(<CompleteProfilePage />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /complete your profile/i }),
      ).toBeInTheDocument();
      expect(screen.getByTestId("complete-profile-form")).toBeInTheDocument();
    });

    expect(screen.getByTestId("auth-split-layout")).toBeInTheDocument();
    expect(screen.getByTestId("auth-route-switch")).toBeInTheDocument();
  });
});
