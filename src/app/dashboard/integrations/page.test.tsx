import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import IntegrationsDashboardPage from "./page";

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

vi.mock(
  "./components/WorkspaceIntegrationsDashboard",
  () => ({
    WorkspaceIntegrationsDashboard: () => (
      <div data-testid="workspace-integrations-dashboard" />
    ),
  }),
);

describe("IntegrationsDashboardPage", () => {
  it("renders inside AuthDashboardShell with activeNav=integrations", () => {
    dashboardShellSpy.mockClear();
    render(<IntegrationsDashboardPage />);

    const shell = screen.getByTestId("dashboard-shell");
    expect(shell).toHaveAttribute("data-active-nav", "integrations");
    expect(dashboardShellSpy).toHaveBeenCalledWith({ activeNav: "integrations" });
  });

  it("renders the WorkspaceIntegrationsDashboard container instead of the under-development placeholder", () => {
    render(<IntegrationsDashboardPage />);

    expect(
      screen.getByTestId("workspace-integrations-dashboard"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/integrations are under development/i),
    ).not.toBeInTheDocument();
  });
});
