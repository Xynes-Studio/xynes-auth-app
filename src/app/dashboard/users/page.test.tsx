import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import UsersDashboardPage from "./page";

vi.mock("@xynes/auth-sdk", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/dashboard", () => ({
  AuthDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">{children}</div>
  ),
}));

vi.mock("@/app/dashboard/components/UnderDevelopmentPanel", () => ({
  UnderDevelopmentPanel: ({ title }: { title: string }) => <div>{title}</div>,
}));

describe("UsersDashboardPage", () => {
  it("renders under development panel inside dashboard shell", () => {
    render(<UsersDashboardPage />);

    expect(screen.getByTestId("dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("Apps is under development")).toBeInTheDocument();
  });
});
