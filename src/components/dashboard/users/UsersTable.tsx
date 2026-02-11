"use client";

import {
  Alert,
  Checkbox,
  Select,
  Skeleton,
} from "@lumia-ui/components";
import type { WorkspaceMemberItem } from "@/lib/users/workspace-members";
import { UsersRow } from "./UsersRow";

type UsersTableProps = {
  members: WorkspaceMemberItem[];
  isLoading: boolean;
  errorMessage?: string | null;
  selectedMemberIds: string[];
  allSelected: boolean;
  isIndeterminate: boolean;
  roleFilter: string;
  typeFilter: string;
  onToggleAll: (checked: boolean) => void;
  onToggleOne: (memberId: string, checked: boolean) => void;
  onRoleFilterChange: (value: string) => void;
  onTypeFilterChange: (value: string) => void;
  onRoleChange: (memberId: string, role: string) => void;
  onDelete: (memberId: string) => void;
};

export function UsersTable({
  members,
  isLoading,
  errorMessage,
  selectedMemberIds,
  allSelected,
  isIndeterminate,
  roleFilter,
  typeFilter,
  onToggleAll,
  onToggleOne,
  onRoleFilterChange,
  onTypeFilterChange,
  onRoleChange,
  onDelete,
}: UsersTableProps) {
  return (
    <div className="space-y-3">
      {errorMessage ? (
        <Alert
          variant="error"
          role="alert"
          description={errorMessage}
          className="text-left"
        />
      ) : null}
      <div className="overflow-hidden rounded-[9px] border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border bg-muted px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <Checkbox
            label="Select All"
            checked={allSelected}
            indeterminate={isIndeterminate}
            onChange={(event) => onToggleAll(event.target.checked)}
          />
          <div className="flex items-center gap-3">
            <Select
              aria-label="Role filter"
              value={roleFilter}
              onChange={(event) => onRoleFilterChange(event.target.value)}
              className="h-9 min-w-[120px] border-border bg-background text-foreground"
            >
              <option value="all">Role</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="member">Member</option>
            </Select>
            <Select
              aria-label="Type filter"
              value={typeFilter}
              onChange={(event) => onTypeFilterChange(event.target.value)}
              className="h-9 min-w-[120px] border-border bg-background text-foreground"
            >
              <option value="all">Type</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>

        <div className="min-h-[480px] px-5 py-4">
          {isLoading ? (
            <div className="space-y-3" role="status" aria-live="polite">
              <span className="sr-only">Loading…</span>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`skeleton-row-${index}`}
                  className="rounded-[13px] border border-border bg-background px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-4 rounded-[5px]" />
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-9 w-28 rounded-md" />
                      <Skeleton className="h-9 w-9 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12 text-sm text-muted-foreground">
              No users found.
            </div>
          ) : (
            <ul className="space-y-3">
              {members.map((member) => (
                <UsersRow
                  key={member.id}
                  member={member}
                  isSelected={selectedMemberIds.includes(member.id)}
                  onToggle={(checked) => onToggleOne(member.id, checked)}
                  onRoleChange={(role) => onRoleChange(member.id, role)}
                  onDelete={() => onDelete(member.id)}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
