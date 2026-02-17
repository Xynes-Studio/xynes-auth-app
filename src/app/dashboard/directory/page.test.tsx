import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DirectoryDashboardPage from "./page";

vi.mock("@xynes/auth-sdk", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/dashboard", () => ({
  AuthDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">{children}</div>
  ),
}));

vi.mock("./components/DirectoryDashboardContent", () => ({
  DirectoryDashboardContent: () => (
    <div data-testid="directory-dashboard-content" />
  ),
}));

describe("DirectoryDashboardPage", () => {
  it("renders dashboard shell and directory content", () => {
    render(<DirectoryDashboardPage />);

    expect(screen.getByTestId("dashboard-shell")).toBeInTheDocument();
    expect(screen.getByTestId("directory-dashboard-content")).toBeInTheDocument();
  });
});
