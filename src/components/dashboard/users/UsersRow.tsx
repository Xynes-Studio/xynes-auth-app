"use client";

import { useMemo } from "react";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  ConfirmDialog,
  Select,
  useConfirmDialog,
} from "@lumia-ui/components";
import type { WorkspaceMemberItem } from "@/lib/users/workspace-members";

type UsersRowProps = {
  member: WorkspaceMemberItem;
  isSelected: boolean;
  onToggle: (checked: boolean) => void;
  onRoleChange: (role: string) => void;
  onDelete: () => void;
};

export function UsersRow({
  member,
  isSelected,
  onToggle,
  onRoleChange,
  onDelete,
}: UsersRowProps) {
  const dialog = useConfirmDialog();
  const roleValue = member.role?.replace("workspace_", "") ?? "member";
  const statusLabel = useMemo(
    () =>
      member.status.charAt(0).toUpperCase() +
      member.status.slice(1).toLowerCase(),
    [member.status],
  );
  const primaryLabel = member.displayName ?? member.email;

  return (
    <li className="flex flex-col gap-4 rounded-[13px] border border-border bg-background px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Checkbox
          aria-label={`Select ${primaryLabel}`}
          checked={isSelected}
          onChange={(event) => onToggle(event.target.checked)}
          className="h-4 w-4"
        />
        <Avatar
          size="md"
          alt={primaryLabel}
          src={member.avatarUrl ?? undefined}
        />
        <div className="min-w-0">
          <div className="text-[16px] font-medium text-foreground truncate">
            {primaryLabel}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {member.isCurrentUser ? (
          <Badge className="border border-border bg-background px-2 py-1 text-[14px] font-medium text-foreground">
            You
          </Badge>
        ) : null}
        <Badge className="border border-border bg-background px-2 py-1 text-[14px] font-medium text-foreground">
          {statusLabel}
        </Badge>
        <Select
          aria-label="Member role"
          value={roleValue}
          onChange={(event) => onRoleChange(event.target.value)}
          className="h-9 min-w-[140px] border-border bg-background text-foreground"
        >
          <option value="owner">Role: Owner</option>
          <option value="admin">Role: Admin</option>
          <option value="member">Role: Member</option>
        </Select>
        <ConfirmDialog
          {...dialog.dialogProps}
          title="Remove user from workspace?"
          description="This action removes their access to the workspace."
          confirmLabel="Remove"
          cancelLabel="Cancel"
          destructive
          onConfirm={onDelete}
          trigger={
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove User"
              className="h-9 w-9 rounded-full border border-border bg-background text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <TrashIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          }
        />
      </div>
    </li>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
    </svg>
  );
}
