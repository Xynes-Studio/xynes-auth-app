"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Menu,
  MenuTrigger,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Button,
  Avatar,
  Spinner,
  Flex,
} from "@lumia-ui/components";
import {
  useAuth,
  useWorkspace,
  type Workspace,
  getWorkspaceInitials,
  formatWorkspaceRole,
  sanitizeWorkspaceSlug,
  getWorkspaceSwitcherAriaLabel,
  isValidRedirectUrl,
} from "@xynes/auth-sdk";
import {
  buildCmsWorkspaceContentUrl,
  WORKSPACE_ADMIN_FALLBACK_PATH,
} from "@/lib/workspace";

/**
 * ChevronDown icon component
 */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * Plus icon component
 */
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Props for the WorkspaceSwitcher component
 */
export interface WorkspaceSwitcherProps {
  /**
   * Optional callback when a workspace is selected
   * If not provided, uses default navigation behavior
   */
  onWorkspaceSelect?: (workspace: Workspace) => void;
  /**
   * Optional callback when "Create new workspace" is clicked
   */
  onCreateNew?: () => void;
  /**
   * Optional custom trigger element
   * If not provided, uses default button with workspace info
   */
  customTrigger?: React.ReactElement;
  /**
   * Size variant for the component
   * @default "default"
   */
  size?: "sm" | "default";
  /**
   * Whether to show the workspace role badge
   * @default false
   */
  showRole?: boolean;
  /**
   * Custom console URL for redirecting after workspace switch
   * Falls back to NEXT_PUBLIC_CONSOLE_URL
   */
  consoleUrl?: string;
  /**
   * CSS class name for the trigger button
   */
  className?: string;
  /**
   * Keep user on current page when switching workspaces
   * @default false
   */
  stayOnCurrentPage?: boolean;
}

/**
 * WorkspaceSwitcher - Dropdown component for switching between workspaces
 *
 * Features:
 * - Shows current workspace with avatar/initials
 * - Dropdown with list of other workspaces
 * - "Create new workspace" option
 * - Fully accessible (keyboard navigation, screen reader support)
 *
 * @example
 * ```tsx
 * // Basic usage - uses default navigation
 * <WorkspaceSwitcher />
 *
 * // With custom callbacks
 * <WorkspaceSwitcher
 *   onWorkspaceSelect={(ws) => console.log("Selected:", ws.name)}
 *   onCreateNew={() => router.push("/onboarding")}
 * />
 * ```
 */
export function WorkspaceSwitcher({
  onWorkspaceSelect,
  onCreateNew,
  customTrigger,
  size = "default",
  showRole = false,
  consoleUrl,
  className,
  stayOnCurrentPage = false,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const { workspaces, isLoading: isAuthLoading } = useAuth();
  const {
    currentWorkspace,
    selectWorkspace,
    isLoading: isWorkspaceLoading,
  } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);

  const isLoading = isAuthLoading || isWorkspaceLoading;

  // Get other workspaces (excluding current)
  const otherWorkspaces = currentWorkspace
    ? workspaces.filter((w) => w.id !== currentWorkspace.id)
    : workspaces;

  // Handle workspace selection
  const handleSelect = useCallback(
    (workspace: Workspace) => {
      if (onWorkspaceSelect) {
        onWorkspaceSelect(workspace);
        setIsOpen(false);
        return;
      }

      // Default behavior: select and navigate
      selectWorkspace(workspace.id);

      if (stayOnCurrentPage) {
        setIsOpen(false);
        return;
      }

      // Navigate to workspace dashboard
      const safeSlug = sanitizeWorkspaceSlug(workspace.slug);
      const targetConsoleUrl =
        consoleUrl || process.env.NEXT_PUBLIC_CONSOLE_URL;

      // Security: Validate the console URL before redirecting
      // Only allow xynes.com domains and localhost in development
      const allowedDomains = ["xynes.com", "localhost:3000", "localhost:3001"];

      if (
        targetConsoleUrl &&
        isValidRedirectUrl(targetConsoleUrl, allowedDomains)
      ) {
        window.location.assign(
          buildCmsWorkspaceContentUrl({
            baseUrl: targetConsoleUrl,
            workspaceSlug: safeSlug,
          }),
        );
      } else {
        // Fall back to local routing if URL is invalid or not provided
        router.push(WORKSPACE_ADMIN_FALLBACK_PATH);
      }

      setIsOpen(false);
    },
    [onWorkspaceSelect, selectWorkspace, consoleUrl, router, stayOnCurrentPage],
  );

  // Handle create new workspace
  const handleCreateNew = useCallback(() => {
    if (onCreateNew) {
      onCreateNew();
      return;
    }

    // Default: navigate to onboarding
    router.push("/onboarding");
    setIsOpen(false);
  }, [onCreateNew, router]);

  // Loading state
  if (isLoading) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2"
        data-testid="workspace-switcher-loading"
      >
        <Spinner size={size === "sm" ? "sm" : "md"} />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  // Aria label for accessibility
  const ariaLabel = getWorkspaceSwitcherAriaLabel(
    currentWorkspace?.name ?? null,
    workspaces.length,
  );

  // Size-dependent styles
  const triggerPadding = size === "sm" ? "px-2 py-1.5" : "px-3 py-2";
  const avatarSize = size === "sm" ? "sm" : "md";
  const textSize = size === "sm" ? "text-sm" : "text-base";

  const renderWorkspaceItem = (
    workspace: Workspace,
    options?: { showOwnerBadge?: boolean },
  ) => (
    <div className="flex w-full items-center gap-3">
      <Avatar
        size="sm"
        alt={workspace.name}
        fallbackInitials={getWorkspaceInitials(workspace.name)}
      />
      <div className="flex-1 min-w-0 text-left">
        <div className="font-medium truncate">{workspace.name}</div>
        <div className="text-xs text-muted-foreground truncate">
          {workspace.slug}
        </div>
      </div>
      {options?.showOwnerBadge && workspace.role === "workspace_owner" && (
        <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full shrink-0">
          Owner
        </span>
      )}
    </div>
  );

  return (
    <Menu open={isOpen} onOpenChange={setIsOpen}>
      <MenuTrigger>
        {customTrigger ?? (
          <Button
            variant="ghost"
            className={`flex w-full flex-nowrap items-center justify-between gap-3 ${triggerPadding} hover:bg-muted/50 ${className ?? ""}`}
            aria-label={ariaLabel}
            aria-haspopup="menu"
            data-testid="workspace-switcher-trigger"
          >
            <Flex
              dir="row"
              className="flex min-w-0 flex-1 items-center gap-3 overflow-hidden"
            >
              {/* Current workspace avatar/initials */}
              <Avatar
                size={avatarSize}
                alt={currentWorkspace?.name ?? "Workspace"}
                fallbackInitials={
                  currentWorkspace
                    ? getWorkspaceInitials(currentWorkspace.name)
                    : "?"
                }
              />

              {/* Workspace name and optional role */}
              <div className="flex min-w-0 items-center gap-2">
                <span className={`font-medium ${textSize} truncate`}>
                  {currentWorkspace?.name ?? "Select workspace"}
                </span>
                {showRole && currentWorkspace && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {formatWorkspaceRole(currentWorkspace.role)}
                  </span>
                )}
              </div>
              {/* Chevron icon */}
              <ChevronDownIcon
                className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </Flex>
          </Button>
        )}
      </MenuTrigger>

      <MenuContent
        align="start"
        className="min-w-[200px] max-w-[280px]"
        data-testid="workspace-switcher-menu"
      >
        {/* Current workspace section */}
        {currentWorkspace && (
          <>
            <MenuLabel>Current Workspace</MenuLabel>
            <MenuItem
              aria-current="true"
              disabled
              data-testid="workspace-switcher-current"
              className="cursor-default"
            >
              {renderWorkspaceItem(currentWorkspace, { showOwnerBadge: true })}
            </MenuItem>
            <MenuSeparator />
          </>
        )}

        {/* Other workspaces section */}
        {otherWorkspaces.length > 0 && (
          <>
            <MenuLabel>Switch to</MenuLabel>
            {otherWorkspaces.map((workspace) => (
              <MenuItem
                key={workspace.id}
                label={workspace.name}
                onSelect={() => handleSelect(workspace)}
                data-testid={`workspace-switcher-item-${workspace.id}`}
                aria-label={`Switch to ${workspace.name}`}
                className="cursor-pointer"
              >
                {renderWorkspaceItem(workspace)}
              </MenuItem>
            ))}
            <MenuSeparator />
          </>
        )}

        {/* Create new workspace option */}
        <MenuItem
          label="Create new workspace"
          onSelect={handleCreateNew}
          data-testid="workspace-switcher-create-new"
          aria-label="Create new workspace"
          className="cursor-pointer"
        >
          <Flex className="items-center gap-2">
            <PlusIcon className="shrink-0 text-muted-foreground" />
            <span>Create new workspace</span>
          </Flex>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
