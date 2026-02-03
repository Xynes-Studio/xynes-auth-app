"use client";

import { Button, Spinner } from "@lumia-ui/components";
import type { Workspace } from "@xynes/auth-sdk";

export interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  onSelect: (workspaceId: string) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
  loadingText?: string;
}

export function WorkspaceSelector({
  workspaces,
  onSelect,
  onCreateNew,
  isLoading = false,
  loadingText,
}: WorkspaceSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">
          {loadingText ?? "Loading..."}
        </p>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground">
          No workspaces found
        </h3>
        <p className="text-muted-foreground mt-2 mb-6">
          Create your first workspace to get started.
        </p>
        <Button onClick={onCreateNew}>Create New Workspace</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            className="group relative overflow-hidden rounded-xl border border-border bg-card text-left transition-[transform,box-shadow,border-color,background-color] duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => onSelect(workspace.id)}
          >
            <div
              className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />

            <div className="p-6 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                {workspace.role === "workspace_owner" && (
                  <span className="text-[10px] font-medium uppercase tracking-wider bg-primary/10 text-primary px-2 py-1 rounded-full">
                    Owner
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-foreground truncate">
                {workspace.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-1 min-w-0">
                <span className="opacity-50">xynes.com/</span>
                {workspace.slug}
              </p>
            </div>
          </button>
        ))}

        {/* Create New Card (always visible at the end or in a separate section?) 
            Story says: "Create new workspace" option at bottom.
            I will put it as the last card or a button below grid.
            The list above is just the workspaces.
            I'll add a card that looks like a "Add New" button.
        */}
        <button
          onClick={onCreateNew}
          type="button"
          className="group flex min-h-[160px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-6 transition-[border-color,background-color,transform,box-shadow] duration-200 hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
            <svg
              className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <span className="font-medium text-foreground group-hover:text-primary transition-colors">
            Create New Workspace
          </span>
        </button>
      </div>
    </div>
  );
}
