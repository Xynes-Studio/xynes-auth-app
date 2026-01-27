import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { WorkspaceSelector } from "./WorkspaceSelector";

// Mock Lumia components
vi.mock("@lumia-ui/components", () => ({
  Card: ({ children, className, onClick }: { children: React.ReactNode; className: string; onClick: () => void }) => (
    <div data-testid="card" className={className} onClick={onClick}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={className}>{children}</div>
  ),
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Spinner: () => <div>Loading...</div>,
}));

// Types
import type { Workspace } from "@xynes/auth-sdk";

const mockWorkspaces: Workspace[] = [
  {
    id: "ws-1",
    name: "Acme Corp",
    slug: "acme-corp",
    planType: "free",
    role: "workspace_owner",
    createdAt: "2023-01-01",
    updatedAt: "2023-01-01",
  },
  {
    id: "ws-2",
    name: "Beta Inc",
    slug: "beta-inc",
    planType: "pro",
    role: "workspace_member",
    createdAt: "2023-02-01",
    updatedAt: "2023-02-01",
  },
];

describe("WorkspaceSelector", () => {
  const onSelectMock = vi.fn();
  const onCreateNewMock = vi.fn();

  it("renders a list of workspaces", () => {
    render(
      <WorkspaceSelector
        workspaces={mockWorkspaces}
        onSelect={onSelectMock}
        onCreateNew={onCreateNewMock}
      />
    );

    expect(screen.getByText("Acme Corp")).toBeInTheDocument();
    // The slug display is split into "xynes.com/" and the slug
    expect(screen.getAllByText("xynes.com/")[0]).toBeInTheDocument();
    expect(screen.getByText("acme-corp")).toBeInTheDocument();
    expect(screen.getByText("Beta Inc")).toBeInTheDocument();
    expect(screen.getByText("beta-inc")).toBeInTheDocument();
  });

  it("calls onSelect when a workspace is clicked", () => {
    render(
      <WorkspaceSelector
        workspaces={mockWorkspaces}
        onSelect={onSelectMock}
        onCreateNew={onCreateNewMock}
      />
    );

    fireEvent.click(screen.getByText("Acme Corp"));
    expect(onSelectMock).toHaveBeenCalledWith("ws-1");
  });

  it("calls onCreateNew when create button is clicked", () => {
    render(
      <WorkspaceSelector
        workspaces={mockWorkspaces}
        onSelect={onSelectMock}
        onCreateNew={onCreateNewMock}
      />
    );

    const createBtn = screen.getByText(/create new workspace/i);
    fireEvent.click(createBtn);
    expect(onCreateNewMock).toHaveBeenCalled();
  });

  it("renders empty state when no workspaces provided", () => {
    render(
      <WorkspaceSelector
        workspaces={[]}
        onSelect={onSelectMock}
        onCreateNew={onCreateNewMock}
      />
    );

    expect(screen.getByText(/create your first workspace/i)).toBeInTheDocument();
  });
  
  it("renders loading state when isLoading is true", () => {
     render(
      <WorkspaceSelector
        workspaces={[]}
        isLoading={true}
        onSelect={onSelectMock}
        onCreateNew={onCreateNewMock}
      />
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });
});
