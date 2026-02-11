import { describe, it, expect, vi, beforeEach } from "vitest";
import React, { useEffect, useMemo, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { WorkspaceRole } from "@xynes/auth-sdk";
import UsersDashboardPage from "./page";

const mockAuthState = {
  user: {
    id: "user-1",
    email: "me@xynes.com",
    displayName: "Ada Lovelace",
    avatarUrl: null,
    emailVerified: true,
    createdAt: "2025-01-01",
    updatedAt: "2025-01-01",
  },
  workspaces: [
    {
      id: "ws-1",
      name: "Xynes",
      slug: "xynes",
      planType: "pro",
      role: "workspace_owner" as WorkspaceRole,
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01",
    },
  ],
  isLoading: false,
};

const mockWorkspaceState = {
  currentWorkspace: mockAuthState.workspaces[0],
  isLoading: false,
  selectWorkspace: vi.fn(),
  clearWorkspace: vi.fn(),
};

const formatWorkspaceRole = (role: string) =>
  role.replace("workspace_", "").toUpperCase();

vi.mock("@xynes/auth-sdk", () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => mockAuthState,
  useWorkspace: () => mockWorkspaceState,
  formatWorkspaceRole: (role: string) => formatWorkspaceRole(role),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/dashboard/users",
}));

vi.mock("@lumia-ui/components", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    id,
    type,
    name,
    "aria-label": ariaLabel,
  }: {
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    id?: string;
    type?: string;
    name?: string;
    "aria-label"?: string;
  }) => (
    <input
      id={id}
      name={name}
      type={type}
      aria-label={ariaLabel ?? "Search users"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  ),
  Tabs: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: React.ReactNode }) => (
    <div role="tablist">{children}</div>
  ),
  TabsTrigger: ({
    children,
    value,
    disabled,
  }: {
    children: React.ReactNode;
    value: string;
    disabled?: boolean;
  }) => (
    <button role="tab" data-value={value} disabled={disabled}>
      {children}
    </button>
  ),
  Button: ({
    children,
    type,
    "aria-label": ariaLabel,
    onClick,
  }: {
    children: React.ReactNode;
    type?: "button" | "submit";
    "aria-label"?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  }) => (
    <button type={type} aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  ),
  Select: ({
    children,
    "aria-label": ariaLabel,
    value,
    onChange,
  }: {
    children: React.ReactNode;
    "aria-label"?: string;
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  }) => (
    <select aria-label={ariaLabel} value={value} onChange={onChange}>
      {children}
    </select>
  ),
  Checkbox: ({
    "aria-label": ariaLabel,
    label,
    checked,
    onChange,
  }: {
    "aria-label"?: string;
    label?: string;
    checked?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <label>
      <input
        type="checkbox"
        aria-label={ariaLabel ?? label}
        checked={checked}
        onChange={onChange}
      />
      {label ? <span>{label}</span> : null}
    </label>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
  Avatar: () => <span data-testid="avatar" />,
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  Spinner: () => <div>Loading</div>,
  Flex: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Skeleton: ({ children }: { children?: React.ReactNode }) => (
    <div>{children}</div>
  ),
  useConfirmDialog: () => {
    const [open, setOpen] = useState(false);
    return useMemo(
      () => ({
        dialogProps: {
          open,
          onOpenChange: setOpen,
        },
        openDialog: () => setOpen(true),
        closeDialog: () => setOpen(false),
      }),
      [open],
    );
  },
  ConfirmDialog: ({
    title,
    description,
    confirmLabel,
    cancelLabel,
    trigger,
    open,
    onOpenChange,
  }: {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    trigger?: React.ReactElement;
    open?: boolean;
    onOpenChange?: (nextOpen: boolean) => void;
  }) => {
    const [isOpen, setIsOpen] = useState(Boolean(open));

    useEffect(() => {
      if (open !== undefined) {
        setIsOpen(open);
      }
    }, [open]);

    const handleOpen = () => {
      setIsOpen(true);
      onOpenChange?.(true);
    };

    const handleClose = () => {
      setIsOpen(false);
      onOpenChange?.(false);
    };

    return (
      <div>
        {trigger
          ? React.cloneElement(trigger, {
              onClick: (event: React.MouseEvent) => {
                trigger.props?.onClick?.(event);
                handleOpen();
              },
            })
          : null}
        {isOpen ? (
          <div role="alertdialog">
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
            <button type="button" onClick={handleClose}>
              {cancelLabel ?? "Cancel"}
            </button>
            <button type="button">{confirmLabel ?? "Confirm"}</button>
          </div>
        ) : null}
      </div>
    );
  },
}));

vi.mock("@/components/dashboard", () => ({
  AuthDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/lib/users/workspace-members", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/lib/users/workspace-members")>();
  return {
    ...mod,
  };
});

describe("UsersDashboardPage", () => {
  beforeEach(() => {
    mockAuthState.isLoading = false;
    mockWorkspaceState.isLoading = false;
  });

  it("renders current user and role badge", () => {
    render(<UsersDashboardPage />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Role: Owner")).toBeInTheDocument();
  });

  it("renders tabs, actions, filters, and member actions", () => {
    render(<UsersDashboardPage />);

    expect(screen.getByRole("tab", { name: /users/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /teams/i })).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /invite people/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: /search for users/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^search$/i }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("checkbox", { name: /select all/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /role filter/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /type filter/i }),
    ).toBeInTheDocument();

    expect(screen.getByText(/you/i)).toBeInTheDocument();
    expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("combobox", { name: /member role/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove user/i }),
    ).toBeInTheDocument();
  });

  it("filters members via search input", async () => {
    render(<UsersDashboardPage />);

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();

    const input = screen.getByLabelText(/search for users/i);
    fireEvent.change(input, { target: { value: "nope" } });

    await waitFor(() => {
      expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    });
  });

  it("renders row badges, role dropdown, and delete confirmation", () => {
    render(<UsersDashboardPage />);

    expect(screen.getByText(/you/i)).toBeInTheDocument();
    expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("combobox", { name: /member role/i }),
    ).toBeInTheDocument();

    const deleteButton = screen.getByRole("button", { name: /remove user/i });
    fireEvent.click(deleteButton);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      screen.getByText(/remove user from workspace/i),
    ).toBeInTheDocument();
  });

  it("shows loading state when auth is loading", () => {
    mockAuthState.isLoading = true;

    render(<UsersDashboardPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
