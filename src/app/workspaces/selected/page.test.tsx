import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}));

vi.mock("@xynes/auth-sdk", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ workspaces: [{ name: "Acme" }], isLoading: false }),
  useWorkspace: () => ({
    currentWorkspace: { name: "Acme" },
    isLoading: false,
  }),
}));

vi.mock("@lumia-ui/components", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

import WorkspaceSelectedPage from "./page";

describe("WorkspaceSelectedPage", () => {
  it("renders a placeholder confirmation", () => {
    render(<WorkspaceSelectedPage />);

    expect(
      screen.getByRole("heading", { name: /workspace selected/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/you selected acme/i)).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /back to workspaces/i }),
    ).toBeInTheDocument();
  });
});
