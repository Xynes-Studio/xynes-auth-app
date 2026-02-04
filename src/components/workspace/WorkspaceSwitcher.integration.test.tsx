/**
 * Integration tests for WorkspaceSwitcher component
 *
 * Tier 2 tests: Component integration - 70% coverage target
 * Following ADR-001 testing standards.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

// Mock next/navigation
const mockPush = vi.fn();
const mockRouter = {
  push: mockPush,
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useRouter: () => mockRouter,
}));

// Mock Lumia components to avoid React version mismatch
vi.mock("@lumia-ui/components", () => ({
  Menu: ({
    children,
    open,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div data-testid="menu" data-open={open}>
      {children}
    </div>
  ),
  MenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="menu-trigger">{children}</div>
  ),
  MenuContent: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="workspace-switcher-menu" className={className}>
      {children}
    </div>
  ),
  MenuItem: ({
    children,
    onSelect,
    onClick,
    label,
    icon,
    ...props
  }: {
    children?: React.ReactNode;
    onSelect?: () => void;
    onClick?: () => void;
    label?: string;
    icon?: string;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
      onClick={() => {
        onSelect?.();
        onClick?.();
      }}
      data-testid={props["data-testid"] ?? `menu-item-${label ?? "default"}`}
      data-lumia-menu-item="true"
      {...props}
    >
      {icon && <span data-testid={`icon-${icon}`} />}
      {children ?? label}
    </button>
  ),
  MenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="menu-label">{children}</div>
  ),
  MenuSeparator: () => <hr data-testid="menu-separator" />,
  Button: ({
    children,
    onClick,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    variant?: string;
  }) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
  Avatar: ({
    alt,
    fallbackInitials,
    size,
  }: {
    alt?: string;
    fallbackInitials?: string;
    size?: string;
  }) => (
    <div data-testid="avatar" data-size={size} aria-label={alt}>
      {fallbackInitials}
    </div>
  ),
  Spinner: ({ size }: { size?: string }) => (
    <div data-testid="spinner" data-size={size}>
      Loading...
    </div>
  ),
  Flex: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="flex" className={className}>
      {children}
    </div>
  ),
}));

// Mock auth SDK hooks
const mockSelectWorkspace = vi.fn();
const mockClearWorkspace = vi.fn();

type MockWorkspace = {
  id: string;
  name: string;
  slug: string;
  planType: "free" | "pro" | "enterprise";
  role: "workspace_owner" | "workspace_admin" | "workspace_member";
  createdAt: string;
  updatedAt: string;
};

let mockAuthState: {
  workspaces: MockWorkspace[];
  isLoading: boolean;
  user: { id: string; email: string } | null;
  isAuthenticated: boolean;
  error: null;
};

let mockWorkspaceState: {
  currentWorkspace: MockWorkspace | null;
  isLoading: boolean;
  selectWorkspace: typeof mockSelectWorkspace;
  clearWorkspace: typeof mockClearWorkspace;
};

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => mockAuthState,
  useWorkspace: () => mockWorkspaceState,
  // Utility functions
  getWorkspaceInitials: (name: string) => {
    if (!name.trim()) return "";
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
    return words[0][0].toUpperCase();
  },
  formatWorkspaceRole: (role: string) => {
    const roleLabels: Record<string, string> = {
      workspace_owner: "Owner",
      workspace_admin: "Admin",
      workspace_member: "Member",
    };
    return roleLabels[role] ?? "Member";
  },
  sanitizeWorkspaceSlug: (slug: string) => slug.replace(/[^a-z0-9-]/g, ""),
  getWorkspaceSwitcherAriaLabel: (name: string | null, count: number) => {
    if (!name) return "Select workspace";
    const otherCount = count - 1;
    if (otherCount === 0) return `Current workspace: ${name}`;
    if (otherCount === 1)
      return `Current workspace: ${name}. 1 other workspace available.`;
    return `Current workspace: ${name}. ${otherCount} other workspaces available.`;
  },
  // Security utility - validates redirect URLs against allowed domains
  isValidRedirectUrl: (url: string, allowedDomains: string[]) => {
    if (!url) return false;
    try {
      const parsedUrl = new URL(url);
      return allowedDomains.some((domain) => {
        const hostname = parsedUrl.hostname.toLowerCase();
        const lowerDomain = domain.toLowerCase();
        if (lowerDomain.includes(":")) {
          const [domainHost] = lowerDomain.split(":");
          return hostname === domainHost;
        }
        return hostname === lowerDomain || hostname.endsWith(`.${lowerDomain}`);
      });
    } catch {
      return false;
    }
  },
}));

// Factory function for creating test workspaces
function createWorkspace(
  overrides: Partial<MockWorkspace> = {},
): MockWorkspace {
  return {
    id: "ws-1",
    name: "Test Workspace",
    slug: "test-workspace",
    planType: "free",
    role: "workspace_member",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("WorkspaceSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock state
    mockAuthState = {
      workspaces: [
        createWorkspace({ id: "ws-1", name: "Workspace One", slug: "ws-one" }),
        createWorkspace({ id: "ws-2", name: "Workspace Two", slug: "ws-two" }),
        createWorkspace({
          id: "ws-3",
          name: "Workspace Three",
          slug: "ws-three",
          role: "workspace_owner",
        }),
      ],
      isLoading: false,
      user: { id: "user-1", email: "test@example.com" },
      isAuthenticated: true,
      error: null,
    };

    mockWorkspaceState = {
      currentWorkspace: mockAuthState.workspaces[0],
      isLoading: false,
      selectWorkspace: mockSelectWorkspace,
      clearWorkspace: mockClearWorkspace,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Loading State", () => {
    it("should show loading spinner when auth is loading", () => {
      mockAuthState.isLoading = true;

      render(<WorkspaceSwitcher />);

      expect(
        screen.getByTestId("workspace-switcher-loading"),
      ).toBeInTheDocument();
      // There are two "Loading..." texts: one from Spinner mock, one from the component
      const loadingTexts = screen.getAllByText("Loading...");
      expect(loadingTexts.length).toBeGreaterThanOrEqual(1);
    });

    it("should show loading spinner when workspace is loading", () => {
      mockWorkspaceState.isLoading = true;

      render(<WorkspaceSwitcher />);

      expect(
        screen.getByTestId("workspace-switcher-loading"),
      ).toBeInTheDocument();
    });
  });

  describe("Trigger Button", () => {
    it("should render trigger with current workspace name", () => {
      render(<WorkspaceSwitcher />);

      // Workspace name appears in both trigger and menu (since menu is always visible in mock)
      const workspaceNameElements = screen.getAllByText("Workspace One");
      expect(workspaceNameElements.length).toBeGreaterThanOrEqual(1);

      // Check the trigger specifically
      const trigger = screen.getByTestId("workspace-switcher-trigger");
      expect(trigger).toHaveTextContent("Workspace One");
    });

    it("should show 'Select workspace' when no current workspace", () => {
      mockWorkspaceState.currentWorkspace = null;

      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      expect(trigger).toHaveTextContent("Select workspace");
    });

    it("should have correct aria-label for accessibility", () => {
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      expect(trigger).toHaveAttribute(
        "aria-label",
        "Current workspace: Workspace One. 2 other workspaces available.",
      );
    });

    it("should show role badge when showRole prop is true", () => {
      render(<WorkspaceSwitcher showRole />);

      expect(screen.getByText("Member")).toBeInTheDocument();
    });

    it("should show Owner role when current workspace is owned", () => {
      mockWorkspaceState.currentWorkspace = mockAuthState.workspaces[2]; // ws-3 is owner

      render(<WorkspaceSwitcher showRole />);

      // When showRole is true and workspace is owner, "Owner" appears twice:
      // once in the role badge in trigger, once in the current workspace section
      const ownerElements = screen.getAllByText("Owner");
      expect(ownerElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Menu Content", () => {
    it("should show current workspace section", () => {
      render(<WorkspaceSwitcher />);

      expect(screen.getByText("Current Workspace")).toBeInTheDocument();
      expect(
        screen.getByTestId("workspace-switcher-current"),
      ).toBeInTheDocument();
    });

    it("should mark current workspace item as aria-current", () => {
      render(<WorkspaceSwitcher />);

      const currentItem = screen.getByTestId("workspace-switcher-current");
      expect(currentItem).toHaveAttribute("aria-current", "true");
    });

    it("should show slug in current workspace section", () => {
      render(<WorkspaceSwitcher />);

      expect(screen.getByText("ws-one")).toBeInTheDocument();
    });

    it("should show 'Switch to' label when other workspaces exist", () => {
      render(<WorkspaceSwitcher />);

      expect(screen.getByText("Switch to")).toBeInTheDocument();
    });

    it("should show other workspaces for switching", () => {
      render(<WorkspaceSwitcher />);

      expect(screen.getByText("Workspace Two")).toBeInTheDocument();
      expect(screen.getByText("Workspace Three")).toBeInTheDocument();
    });

    it("should render switch options using MenuItem", () => {
      render(<WorkspaceSwitcher />);

      expect(
        screen.getByTestId("workspace-switcher-item-ws-2"),
      ).toHaveAttribute("data-lumia-menu-item");
      expect(
        screen.getByTestId("workspace-switcher-create-new"),
      ).toHaveAttribute("data-lumia-menu-item");
    });

    it("should show pointer cursor for switch options", () => {
      render(<WorkspaceSwitcher />);

      const switchItem = screen.getByTestId("workspace-switcher-item-ws-2");
      const createNew = screen.getByTestId("workspace-switcher-create-new");

      expect(switchItem.className).toContain("cursor-pointer");
      expect(createNew.className).toContain("cursor-pointer");
    });

    it("should not show current workspace in switch list", () => {
      render(<WorkspaceSwitcher />);

      // Current workspace is Workspace One, should not appear in switch items
      const switchItems = screen.queryAllByTestId(/workspace-switcher-item-/);
      const ws1Item = switchItems.find(
        (item) =>
          item.getAttribute("data-testid") === "workspace-switcher-item-ws-1",
      );
      expect(ws1Item).toBeUndefined();
    });

    it("should show 'Create new workspace' option", () => {
      render(<WorkspaceSwitcher />);

      expect(
        screen.getByTestId("workspace-switcher-create-new"),
      ).toBeInTheDocument();
      expect(screen.getByText("Create new workspace")).toBeInTheDocument();
    });
  });

  describe("Workspace Selection", () => {
    it("should call selectWorkspace when workspace item is clicked", async () => {
      const user = userEvent.setup();

      render(<WorkspaceSwitcher />);

      const ws2Item = screen.getByTestId("workspace-switcher-item-ws-2");
      await user.click(ws2Item);

      expect(mockSelectWorkspace).toHaveBeenCalledWith("ws-2");
    });

    it("should navigate to workspace dashboard on selection", async () => {
      const user = userEvent.setup();

      render(<WorkspaceSwitcher />);

      const ws2Item = screen.getByTestId("workspace-switcher-item-ws-2");
      await user.click(ws2Item);

      // Should navigate to local route when no console URL
      expect(mockPush).toHaveBeenCalledWith("/dashboard/ws-two");
    });

    it("should call custom onWorkspaceSelect callback if provided", async () => {
      const user = userEvent.setup();
      const onWorkspaceSelect = vi.fn();

      render(<WorkspaceSwitcher onWorkspaceSelect={onWorkspaceSelect} />);

      const ws2Item = screen.getByTestId("workspace-switcher-item-ws-2");
      await user.click(ws2Item);

      expect(onWorkspaceSelect).toHaveBeenCalledWith(
        expect.objectContaining({ id: "ws-2", name: "Workspace Two" }),
      );
      // Should not call default selectWorkspace
      expect(mockSelectWorkspace).not.toHaveBeenCalled();
    });

    it("should stay on current page when stayOnCurrentPage is true", async () => {
      const user = userEvent.setup();

      render(<WorkspaceSwitcher stayOnCurrentPage />);

      const ws2Item = screen.getByTestId("workspace-switcher-item-ws-2");
      await user.click(ws2Item);

      expect(mockSelectWorkspace).toHaveBeenCalledWith("ws-2");
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Create New Workspace", () => {
    it("should navigate to onboarding when create new is clicked", async () => {
      const user = userEvent.setup();

      render(<WorkspaceSwitcher />);

      const createNew = screen.getByTestId("workspace-switcher-create-new");
      await user.click(createNew);

      expect(mockPush).toHaveBeenCalledWith("/onboarding");
    });

    it("should call custom onCreateNew callback if provided", async () => {
      const user = userEvent.setup();
      const onCreateNew = vi.fn();

      render(<WorkspaceSwitcher onCreateNew={onCreateNew} />);

      const createNew = screen.getByTestId("workspace-switcher-create-new");
      await user.click(createNew);

      expect(onCreateNew).toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe("Size Variants", () => {
    it("should apply small size styles when size='sm'", () => {
      render(<WorkspaceSwitcher size="sm" />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      expect(trigger.className).toContain("px-2");
    });

    it("should apply default size styles by default", () => {
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      expect(trigger.className).toContain("px-3");
    });
  });

  describe("Custom Trigger", () => {
    it("should render custom trigger when provided", () => {
      render(
        <WorkspaceSwitcher
          customTrigger={
            <button data-testid="custom-trigger">Custom Trigger</button>
          }
        />,
      );

      expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
      expect(screen.getByText("Custom Trigger")).toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    it("should have proper aria-haspopup attribute", () => {
      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    });

    it("should have aria-label on workspace items", () => {
      render(<WorkspaceSwitcher />);

      const item = screen.getByTestId("workspace-switcher-item-ws-2");
      expect(item).toHaveAttribute("aria-label", "Switch to Workspace Two");
    });

    it("should have aria-label on create new option", () => {
      render(<WorkspaceSwitcher />);

      const createNew = screen.getByTestId("workspace-switcher-create-new");
      expect(createNew).toHaveAttribute("aria-label", "Create new workspace");
    });

    it("should show aria-label for single workspace", () => {
      mockAuthState.workspaces = [mockAuthState.workspaces[0]];

      render(<WorkspaceSwitcher />);

      const trigger = screen.getByTestId("workspace-switcher-trigger");
      expect(trigger).toHaveAttribute(
        "aria-label",
        "Current workspace: Workspace One",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty workspaces array", () => {
      mockAuthState.workspaces = [];
      mockWorkspaceState.currentWorkspace = null;

      render(<WorkspaceSwitcher />);

      expect(screen.getByText("Select workspace")).toBeInTheDocument();
    });

    it("should handle single workspace (no switch options)", () => {
      mockAuthState.workspaces = [mockAuthState.workspaces[0]];

      render(<WorkspaceSwitcher />);

      // Should not show "Switch to" section
      expect(screen.queryByText("Switch to")).not.toBeInTheDocument();
      // Should still show "Create new workspace"
      expect(screen.getByText("Create new workspace")).toBeInTheDocument();
    });

    it("should handle workspace with special characters in name", () => {
      mockAuthState.workspaces[1].name = "Workspace & Co <test>";

      render(<WorkspaceSwitcher />);

      // Should display the name (HTML escaped by React)
      expect(screen.getByText("Workspace & Co <test>")).toBeInTheDocument();
    });

    it("should show owner badge in current workspace section when owner", () => {
      mockWorkspaceState.currentWorkspace = mockAuthState.workspaces[2]; // ws-3 is owner

      render(<WorkspaceSwitcher />);

      // The owner badge in the current workspace section
      const currentSection = screen.getByTestId("workspace-switcher-current");
      expect(currentSection).toHaveTextContent("Owner");
    });
  });
});
