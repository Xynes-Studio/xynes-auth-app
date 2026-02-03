import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import WorkspaceSelectorPage from "./page";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockSelectWorkspace = vi.fn();
const mockUseAuth = vi.fn();
const mockUseWorkspace = vi.fn();

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: (...args: unknown[]) => mockUseAuth(...args),
  useWorkspace: (...args: unknown[]) => mockUseWorkspace(...args),
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("WorkspaceSelectorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_CONSOLE_URL;
  });

  it("should auto-redirect when exactly one workspace exists", async () => {
    mockUseAuth.mockReturnValue({
      workspaces: [{ id: "ws-1", name: "My Workspace", slug: "my-workspace" }],
      isLoading: false,
    });

    mockUseWorkspace.mockReturnValue({
      selectWorkspace: mockSelectWorkspace,
      isLoading: false,
    });

    render(<WorkspaceSelectorPage />);

    await waitFor(() => {
      expect(mockSelectWorkspace).toHaveBeenCalledWith("ws-1");
      expect(mockPush).toHaveBeenCalledWith("/dashboard/my-workspace");
    });
  });

  it("should not auto-redirect when multiple workspaces exist", async () => {
    mockUseAuth.mockReturnValue({
      workspaces: [
        { id: "ws-1", name: "Workspace One", slug: "ws-one" },
        { id: "ws-2", name: "Workspace Two", slug: "ws-two" },
      ],
      isLoading: false,
    });

    mockUseWorkspace.mockReturnValue({
      selectWorkspace: mockSelectWorkspace,
      isLoading: false,
    });

    render(<WorkspaceSelectorPage />);

    // Give effects a chance to run
    await new Promise((r) => setTimeout(r, 0));

    expect(mockSelectWorkspace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

