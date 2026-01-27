"use client";

import { Card, CardContent, Button, Spinner } from "@lumia-ui/components";
import type { Workspace } from "@xynes/auth-sdk";

export interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  onSelect: (workspaceId: string) => void;
  onCreateNew: () => void;
  isLoading?: boolean;
}

export function WorkspaceSelector({
  workspaces,
  onSelect,
  onCreateNew,
  isLoading = false,
}: WorkspaceSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
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
          <Card
            key={workspace.id}
            className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-primary/50 relative group overflow-hidden"
            onClick={() => onSelect(workspace.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onSelect(workspace.id);
              }
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <CardContent className="p-6">
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
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-1">
                <span className="opacity-50">xynes.com/</span>
                {workspace.slug}
              </p>
            </CardContent>
          </Card>
        ))}
        
        {/* Create New Card (always visible at the end or in a separate section?) 
            Story says: "Create new workspace" option at bottom.
            I will put it as the last card or a button below grid.
            The list above is just the workspaces.
            I'll add a card that looks like a "Add New" button.
        */}
        <button
          onClick={onCreateNew}
          className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 min-h-[160px] group"
        >
          <div className="h-12 w-12 rounded-full bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
            <svg
              className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
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
            Create new workspace
          </span>
        </button>
      </div>
    </div>
  );
}
