import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileDashboardPage from "./page";

vi.mock("@xynes/auth-sdk", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
}));

const dashboardShellSpy = vi.fn();

vi.mock("@/components/dashboard", () => ({
  AuthDashboardShell: ({
    children,
    activeNav,
  }: {
    children: React.ReactNode;
    activeNav?: string;
  }) => {
    dashboardShellSpy({ activeNav });
    return (
      <div data-testid="dashboard-shell" data-active-nav={activeNav}>
        {children}
      </div>
    );
  },
}));

vi.mock("@/components/profile/ProfileComingSoon", () => ({
  ProfileComingSoon: () => <div data-testid="profile-coming-soon" />,
}));

describe("ProfileDashboardPage (BUG-AUTH-3a)", () => {
  it("renders inside AuthDashboardShell", () => {
    dashboardShellSpy.mockClear();
    render(<ProfileDashboardPage />);

    expect(screen.getByTestId("dashboard-shell")).toBeInTheDocument();
    expect(dashboardShellSpy).toHaveBeenCalledTimes(1);
  });

  it("renders the ProfileComingSoon placeholder, not an under-development panel", () => {
    render(<ProfileDashboardPage />);

    expect(screen.getByTestId("profile-coming-soon")).toBeInTheDocument();
    expect(
      screen.queryByText(/under development/i),
    ).not.toBeInTheDocument();
  });

  it("uses activeNav='settings' as a closed-type-safe default (no sidebar item is highlighted because /profile is outside the nav set)", () => {
    dashboardShellSpy.mockClear();
    render(<ProfileDashboardPage />);

    expect(dashboardShellSpy).toHaveBeenCalledWith({ activeNav: "settings" });
  });
});
