/**
 * Integration tests for AuthDashboardShell component
 *
 * Tier 2 tests: Component integration - 70% coverage target
 * Following ADR-001 testing standards.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthDashboardShell } from "./AuthDashboardShell";

vi.mock("@lumia-ui/components", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-footer">{children}</div>
  ),
  SideNavItem: ({
    label,
    href,
    active,
  }: {
    label: string;
    href?: string;
    active?: boolean;
  }) => (
    <a href={href} data-active={active ? "true" : undefined}>
      {label}
    </a>
  ),
}));

vi.mock("@/components/workspace/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () => <div data-testid="workspace-switcher" />,
}));

describe("AuthDashboardShell", () => {
  it("renders nav items and main content slot", () => {
    render(
      <AuthDashboardShell activeNav="users">
        <div>Users content</div>
      </AuthDashboardShell>,
    );

    expect(screen.getByTestId("workspace-switcher")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /settings/i })).toBeInTheDocument();
    expect(screen.getByText("Users content")).toBeInTheDocument();
  });
});
