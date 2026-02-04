"use client";

import { useMemo, useState } from "react";
import {
  AuthGuard,
  formatWorkspaceRole,
  useAuth,
  useWorkspace,
} from "@xynes/auth-sdk";
import {
  Avatar,
  Badge,
  Card,
  CardContent,
  CardHeader,
  EmptyState,
  Flex,
  Input,
  PageHeader,
  Spinner,
} from "@lumia-ui/components";
import { AuthDashboardShell } from "@/components/dashboard";
import {
  buildWorkspaceMembers,
  filterWorkspaceMembers,
} from "@/lib/users/workspace-members";

export default function UsersDashboardPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [query, setQuery] = useState("");

  const isLoading = authLoading || workspaceLoading;

  const members = useMemo(
    () => buildWorkspaceMembers({ user, workspace: currentWorkspace }),
    [user, currentWorkspace],
  );

  const filteredMembers = useMemo(
    () => filterWorkspaceMembers(members, query),
    [members, query],
  );

  const memberCount = members.length;
  const memberCountLabel = `${memberCount} ${memberCount === 1 ? "User" : "Users"}`;

  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="users">
        <div className="flex h-full flex-col gap-8">
          <Card className="flex-1">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-red-300 gap-4 mb-4">
              <Flex className="w-full sm:w-[260px] align-middle">
                <div className="flex items-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {memberCountLabel}
                  </span>
                </div>
                <Input
                  id="user-search"
                  name="userSearch"
                  type="search"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="Search by name or email…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </Flex>
            </CardHeader>

            <CardContent className="min-h-[320px]">
              {isLoading ? (
                <Flex
                  className="h-full items-center justify-center gap-2"
                  role="status"
                  aria-live="polite"
                >
                  <Spinner size="md" />
                  <span className="text-sm text-muted-foreground">
                    Loading users…
                  </span>
                </Flex>
              ) : filteredMembers.length === 0 ? (
                <EmptyState
                  icon="users"
                  title={query ? "No matches found" : "No members listed yet"}
                  description={
                    query
                      ? "Try another name or email."
                      : "Once you invite teammates, roles and statuses will appear here."
                  }
                />
              ) : (
                <div className="rounded-2xl border border-border/40 bg-card/30">
                  <ul className="divide-y divide-border/30">
                    {filteredMembers.map((member) => {
                      const primaryLabel = member.displayName ?? member.email;
                      const secondaryLabel = member.displayName
                        ? member.email
                        : null;
                      const statusLabel =
                        member.status.charAt(0).toUpperCase() +
                        member.status.slice(1);

                      return (
                        <li
                          key={member.id}
                          className="flex flex-col gap-3 px-4 py-3 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar
                              size="sm"
                              alt={primaryLabel}
                              src={member.avatarUrl ?? undefined}
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-foreground truncate">
                                {primaryLabel}
                              </div>
                              {secondaryLabel ? (
                                <div className="text-xs text-muted-foreground truncate">
                                  {secondaryLabel}
                                </div>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {member.isCurrentUser ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                You
                              </Badge>
                            ) : null}
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wide"
                            >
                              {formatWorkspaceRole(member.role)}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[10px] uppercase tracking-wide"
                            >
                              {statusLabel}
                            </Badge>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AuthDashboardShell>
    </AuthGuard>
  );
}
