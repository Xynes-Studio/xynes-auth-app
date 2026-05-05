import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";

const mockPush = vi.fn();
let redirectValue: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "redirect" ? redirectValue : null),
  }),
}));

const mockSelectWorkspace = vi.fn();

vi.mock("@xynes/auth-sdk", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    workspaces: [
      {
        id: "ws-1",
        name: "Acme",
        slug: "acme",
        planType: "free",
        role: "workspace_owner",
        createdAt: "2023-01-01",
        updatedAt: "2023-01-01",
      },
      {
        id: "ws-2",
        name: "Beta",
        slug: "beta",
        planType: "pro",
        role: "workspace_member",
        createdAt: "2023-02-01",
        updatedAt: "2023-02-01",
      },
    ],
    isLoading: false,
  }),
  useWorkspace: () => ({
    selectWorkspace: mockSelectWorkspace,
    isLoading: false,
  }),
}));

vi.mock("@/components/workspace/WorkspaceSelector", () => ({
  WorkspaceSelector: ({
    workspaces,
    onSelect,
  }: {
    workspaces: Array<{ id: string; name: string }>;
    onSelect: (id: string) => void;
  }) => (
    <div>
      {workspaces.map((ws) => (
        <button key={ws.id} type="button" onClick={() => onSelect(ws.id)}>
          {ws.name}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("@/lib/redirect", () => ({
  getAllowedRedirectDomains: vi.fn(() => ["xynes.com", "localhost:3000"]),
  getSafeRedirectUrl: vi.fn((url: string) => url),
}));

import WorkspaceSelectorPage from "./page";

describe("WorkspacesPage redirect behavior", () => {
  let originalLocation: Location;
  const assignSpy = vi.fn();
  let originalConsoleUrl: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    redirectValue = null;

    // Mock window.location.assign
    originalLocation = window.location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = {
      assign: assignSpy,
      origin: "http://localhost:3100",
    } as unknown as Location;

    originalConsoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL;
    process.env.NEXT_PUBLIC_CONSOLE_URL = "https://cms.xynes.com";
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = originalLocation;

    process.env.NEXT_PUBLIC_CONSOLE_URL = originalConsoleUrl;
  });

  it("redirects externally only when redirect param exists", async () => {
    redirectValue = "https://cms.xynes.com/dashboard";

    render(<WorkspaceSelectorPage />);
    fireEvent.click(screen.getByRole("button", { name: "Acme" }));

    await waitFor(() => {
      expect(mockSelectWorkspace).toHaveBeenCalledWith("ws-1");
      expect(assignSpy).toHaveBeenCalledWith("https://cms.xynes.com/dashboard");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  it("routes to dashboard when redirect param is missing", async () => {
    redirectValue = null;

    render(<WorkspaceSelectorPage />);
    fireEvent.click(screen.getByRole("button", { name: "Acme" }));

    await waitFor(() => {
      expect(mockSelectWorkspace).toHaveBeenCalledWith("ws-1");
      expect(assignSpy).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/dashboard/apps");
    });
  });

  it("prevents multiple selections from rapid repeated clicks", async () => {
    redirectValue = null;

    render(<WorkspaceSelectorPage />);
    const acmeButton = screen.getByRole("button", { name: "Acme" });

    await act(async () => {
      fireEvent.click(acmeButton);
      fireEvent.click(acmeButton);
      fireEvent.click(acmeButton);

      // Allow the async selection handler to advance to its awaited boundary.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockSelectWorkspace).toHaveBeenCalledTimes(1);
    expect(mockSelectWorkspace).toHaveBeenCalledWith("ws-1");
  });
});
