import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AppsDashboardPage from "./page";

const mockUseFeatureFlag = vi.fn();

vi.mock("@xynes/auth-sdk", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
  useFeatureFlag: () => mockUseFeatureFlag(),
}));

vi.mock("@/components/dashboard", () => ({
  AuthDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">{children}</div>
  ),
}));

vi.mock("./components/AppsDashboardContent", () => ({
  AppsDashboardContent: () => <div data-testid="apps-dashboard-content" />,
}));

describe("AppsDashboardPage", () => {
  it("renders apps content when feature flag is enabled", () => {
    mockUseFeatureFlag.mockReturnValue(true);

    render(<AppsDashboardPage />);

    expect(screen.getByTestId("dashboard-shell")).toBeInTheDocument();
    expect(screen.getByTestId("apps-dashboard-content")).toBeInTheDocument();
  });

  it("renders disabled panel when feature flag is disabled", () => {
    mockUseFeatureFlag.mockReturnValue(false);

    render(<AppsDashboardPage />);

    expect(screen.getByText("Apps dashboard is disabled")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enable feature flag xynes_auth_dashboard_apps_v1 to view Apps.",
      ),
    ).toBeInTheDocument();
  });
});
