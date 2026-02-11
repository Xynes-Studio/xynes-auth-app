"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AuthGuard,
  formatWorkspaceRole,
  useAuth,
  useWorkspace,
} from "@xynes/auth-sdk";
import { AuthDashboardShell } from "@/components/dashboard";
import {
  UsersTable,
  UsersTabs,
  UsersToolbar,
} from "@/components/dashboard/users";
import {
  buildWorkspaceMembers,
  filterWorkspaceMembers,
} from "@/lib/users/workspace-members";

export default function UsersDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasInitialized = useRef(false);
  const { user, isLoading: authLoading } = useAuth();
  const { currentWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const [activeTab, setActiveTab] = useState<"users" | "teams">("users");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const isLoading = authLoading || workspaceLoading;

  const members = useMemo(
    () => buildWorkspaceMembers({ user, workspace: currentWorkspace }),
    [user, currentWorkspace],
  );

  const filteredMembers = useMemo(() => {
    const queryFiltered = filterWorkspaceMembers(members, query);
    return queryFiltered.filter((member) => {
      const normalizedRole = formatWorkspaceRole(member.role).toLowerCase();
      const roleMatches = roleFilter === "all" || normalizedRole === roleFilter;
      const typeMatches = typeFilter === "all" || member.status === typeFilter;
      return roleMatches && typeMatches;
    });
  }, [members, query, roleFilter, typeFilter]);

  const visibleMemberIds = useMemo(
    () => filteredMembers.map((member) => member.id),
    [filteredMembers],
  );
  const visibleSelectedCount = useMemo(
    () =>
      visibleMemberIds.filter((id) => selectedMemberIds.includes(id)).length,
    [visibleMemberIds, selectedMemberIds],
  );
  const allSelected =
    visibleMemberIds.length > 0 &&
    visibleSelectedCount === visibleMemberIds.length;
  const isIndeterminate =
    visibleSelectedCount > 0 && visibleSelectedCount < visibleMemberIds.length;

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    const tabParam = searchParams.get("tab");
    const queryParam = searchParams.get("q");
    const roleParam = searchParams.get("role");
    const typeParam = searchParams.get("type");

    if (tabParam === "teams") {
      setActiveTab("teams");
    }
    if (queryParam) {
      setQuery(queryParam);
      setDebouncedQuery(queryParam);
    }
    if (roleParam) {
      setRoleFilter(roleParam);
    }
    if (typeParam) {
      setTypeFilter(typeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    setSelectedMemberIds((prev) =>
      prev.filter((id) => visibleMemberIds.includes(id)),
    );
  }, [visibleMemberIds]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (activeTab === "teams") nextParams.set("tab", "teams");
    if (debouncedQuery) nextParams.set("q", debouncedQuery);
    if (roleFilter !== "all") nextParams.set("role", roleFilter);
    if (typeFilter !== "all") nextParams.set("type", typeFilter);

    const nextQuery = nextParams.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
        scroll: false,
      });
    }
  }, [
    activeTab,
    debouncedQuery,
    pathname,
    roleFilter,
    router,
    searchParams,
    typeFilter,
  ]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedMemberIds(visibleMemberIds);
    } else {
      setSelectedMemberIds((prev) =>
        prev.filter((id) => !visibleMemberIds.includes(id)),
      );
    }
  };

  const handleToggleMember = (memberId: string, checked: boolean) => {
    setSelectedMemberIds((prev) =>
      checked ? [...prev, memberId] : prev.filter((id) => id !== memberId),
    );
  };

  const handleTabChange = (tab: "users" | "teams") => {
    setActiveTab(tab);
    router.push(tab === "teams" ? "/dashboard/users?tab=teams" : "/dashboard/users");
  };

  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="users">
        <div className="flex h-full flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <UsersTabs activeTab={activeTab} onTabChange={handleTabChange} />
            <UsersToolbar
              searchValue={query}
              onSearchValueChange={setQuery}
              onSearchSubmit={() => undefined}
              onInvite={() => undefined}
            />
          </div>

          <UsersTable
            members={filteredMembers}
            isLoading={isLoading}
            errorMessage={null}
            selectedMemberIds={selectedMemberIds}
            allSelected={allSelected}
            isIndeterminate={isIndeterminate}
            roleFilter={roleFilter}
            typeFilter={typeFilter}
            onToggleAll={handleSelectAll}
            onToggleOne={handleToggleMember}
            onRoleFilterChange={setRoleFilter}
            onTypeFilterChange={setTypeFilter}
            onRoleChange={() => undefined}
            onDelete={() => undefined}
          />
        </div>
      </AuthDashboardShell>
    </AuthGuard>
  );
}
