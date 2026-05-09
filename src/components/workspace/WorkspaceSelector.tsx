"use client";

import { Button, Spinner } from "@lumia-ui/components";
import type { Workspace } from "@xynes/auth-sdk";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("auth.workspaces.selector");
  const showOverlay = isLoading && workspaces.length > 0;

  if (isLoading && workspaces.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-muted-foreground">
          {loadingText ?? t("loadingDefault")}
        </p>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-foreground">
          {t("emptyTitle")}
        </h3>
        <p className="text-muted-foreground mt-2 mb-6">
          {t("emptyDescription")}
        </p>
        <Button onClick={onCreateNew}>{t("emptyAction")}</Button>
      </div>
    );
  }

  return (
    <div className="relative space-y-8" aria-busy={isLoading}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {workspaces.map((workspace) => (
          <button
            key={workspace.id}
            type="button"
            disabled={isLoading}
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 text-left transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70"
            onClick={() => onSelect(workspace.id)}
          >
            <div
              className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_55%)] opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />

            <div className="relative p-6 min-w-0">
              <div className="flex items-start justify-between mb-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-semibold text-xl shadow-sm">
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
                {workspace.role === "workspace_owner" && (
                  <span className="text-[10px] font-semibold uppercase tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {t("ownerBadge")}
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-foreground truncate">
                {workspace.name}
              </h3>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-1 min-w-0">
                <span className="opacity-60">xynes.com/</span>
                {workspace.slug}
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex h-2 w-2 rounded-full bg-primary/60" />
                <span className="uppercase tracking-[0.2em]">
                  {t("activeLabel")}
                </span>
              </div>
            </div>
          </button>
        ))}

        <button
          onClick={onCreateNew}
          type="button"
          disabled={isLoading}
          className="group flex min-h-[180px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/80 p-6 transition-[border-color,background-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70"
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
          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {t("createCardTitle")}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            {t("createCardSubtitle")}
          </span>
        </button>
      </div>

      {showOverlay ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/70 backdrop-blur-sm"
          role="status"
          aria-live="polite"
        >
          <Spinner size="lg" />
          <p className="text-sm text-muted-foreground">
            {loadingText ?? t("loadingSelecting")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
