"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Flex, UserTile, type ViewMode } from "@lumia-ui/components";
import { Icon } from "@lumia-ui/icons";
import { useAuth, useWorkspace } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import {
  DashboardNoResults,
  EntityCollectionTemplate,
  useDebouncedValue,
  type EntityCollectionSortOption,
} from "@/components/dashboard";
import {
  DirectoryMembersApiError,
  fetchWorkspaceMembers,
} from "@/lib/dashboard/directory/members-api";
import {
  filterDirectoryMembers,
  getDirectoryUiState,
  sortDirectoryMembers,
  type DirectoryMember,
  type DirectorySortOption,
} from "@/lib/dashboard/directory/members-transform";

type DirectoryTab = "users" | "teams" | "invites";

const SORT_OPTIONS: EntityCollectionSortOption[] = [
  { value: "joined_desc", label: "Date (Newest)" },
  { value: "joined_asc", label: "Date (Oldest)" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
];

function getUsersLoadErrorMessage(error: unknown): string {
  if (!(error instanceof DirectoryMembersApiError)) {
    return "Failed to load directory users.";
  }

  if (error.statusCode === 400) {
    return "Workspace is not selected.";
  }

  if (error.statusCode === 401 || error.statusCode === 403) {
    return "You don’t have permission to view workspace users.";
  }

  if (error.statusCode === 429) {
    return "Too many requests. Please try again in a moment.";
  }

  return "Failed to load directory users.";
}

export function DirectoryDashboardContent() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspace();
  const { getAccessToken } = useAuth();

  const [activeTab, setActiveTab] = useState<DirectoryTab>("users");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortValue, setSortValue] = useState<DirectorySortOption>("joined_desc");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";
  const searchDisabled = activeTab !== "users";

  useEffect(() => {
    if (activeTab !== "users") {
      return;
    }

    setQuery(debouncedSearch);
  }, [activeTab, debouncedSearch]);

  useEffect(() => {
    if (activeTab !== "users") {
      return;
    }

    if (!currentWorkspace?.id) {
      setMembers([]);
      setMembersError("No workspace selected.");
      return;
    }

    const controller = new AbortController();
    setIsLoadingMembers(true);
    setMembersError(null);

    fetchWorkspaceMembers({
      apiBaseUrl,
      workspaceId: currentWorkspace.id,
      getAccessToken,
      signal: controller.signal,
    })
      .then((nextMembers) => {
        if (controller.signal.aborted) return;
        setMembers(nextMembers);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setMembersError(getUsersLoadErrorMessage(error));
        setMembers([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingMembers(false);
        }
      });

    return () => controller.abort();
  }, [activeTab, apiBaseUrl, currentWorkspace?.id, getAccessToken]);

  const filteredUsers = useMemo(() => {
    const filtered = filterDirectoryMembers(members, query);
    return sortDirectoryMembers(filtered, sortValue);
  }, [members, query, sortValue]);

  const resultCount = activeTab === "users" ? filteredUsers.length : 0;
  const uiState = getDirectoryUiState(resultCount);

  useEffect(() => {
    const filteredIds = new Set(filteredUsers.map((member) => member.id));
    setSelectedIds((prev) => prev.filter((id) => filteredIds.has(id)));
  }, [filteredUsers]);

  const allSelected =
    filteredUsers.length > 0 &&
    filteredUsers.every((member) => selectedIds.includes(member.id));

  const showUsersError = activeTab === "users" && Boolean(membersError);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <EntityCollectionTemplate
        tabs={[
          { value: "users", label: "Users" },
          { value: "teams", label: "Teams" },
          { value: "invites", label: "Invites" },
        ]}
        activeTab={activeTab}
        onTabChange={(value) => setActiveTab(value as DirectoryTab)}
        searchLeadingAction={
          <Button
            type="button"
            onClick={() => router.push("/workspaces/invites/new")}
            aria-label="Invite people"
            className="w-10 px-0 sm:w-auto sm:px-4"
          >
            <span className="relative inline-flex h-4 w-4 items-center justify-center">
              <Icon
                name="users-round"
                size={16}
                color="#FFFFFF"
                className="shrink-0"
                aria-hidden
              />
              <span className="absolute -bottom-1.5 -right-1.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-primary bg-background">
                <Icon name="add" size={10} color="primary" aria-hidden />
              </span>
            </span>
            <span className="hidden sm:inline">Invite People</span>
          </Button>
        }
        searchValue={searchInput}
        onSearchValueChange={setSearchInput}
        onSearchSubmit={() => setQuery(searchInput)}
        searchPlaceholder="Search for users"
        searchAriaLabel="Search for users"
        searchDisabled={searchDisabled}
        totalResults={resultCount}
        selectAllChecked={allSelected}
        onSelectAllChange={(nextChecked) => {
          if (!nextChecked) {
            setSelectedIds([]);
            return;
          }
          setSelectedIds(filteredUsers.map((member) => member.id));
        }}
        selectAllAriaLabel="Select all users"
        selectAllDisabled={
          searchDisabled || uiState.isSelectAllDisabled || isLoadingMembers || showUsersError
        }
        sortValue={sortValue}
        sortOptions={SORT_OPTIONS}
        onSortChange={(nextSort) => setSortValue(nextSort as DirectorySortOption)}
        sortAriaLabel="Sort users"
        sortDisabled={
          searchDisabled || uiState.isSortDisabled || isLoadingMembers || showUsersError
        }
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        {activeTab === "teams" ? (
          <UnderDevelopmentPanel
            title="Teams are under development"
            description="Team directory experiences are coming soon."
          />
        ) : activeTab === "invites" ? (
          <UnderDevelopmentPanel
            title="Invites are under development"
            description="Invite management is coming soon."
          />
        ) : isLoadingMembers ? (
          <section
            className="flex h-full min-h-[220px] items-center justify-center text-sm text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            Loading users...
          </section>
        ) : membersError ? (
          <section
            className="flex h-full min-h-[220px] items-center justify-center rounded-md border border-border bg-muted/20 p-6 text-sm text-foreground"
            role="alert"
          >
            {membersError}
          </section>
        ) : filteredUsers.length === 0 ? (
          <DashboardNoResults
            query={query}
            onClear={() => {
              setSearchInput("");
              setQuery("");
            }}
          />
        ) : (
          <Flex
            direction={viewMode === "grid" ? "row" : "col"}
            wrap={viewMode === "grid" ? "wrap" : "nowrap"}
            gap="md"
            className={viewMode === "grid" ? "items-start" : "w-full"}
          >
            {filteredUsers.map((member) => (
              <UserTile
                key={member.id}
                tileId={member.id}
                view={viewMode}
                name={member.name}
                designation={member.designation}
                avatarSrc={member.avatarUrl ?? undefined}
                avatarFallbackInitials={member.name}
                selectable
                selected={selectedIds.includes(member.id)}
                selectionAriaLabel={`Select ${member.name}`}
                onSelectedChange={(nextChecked) => {
                  setSelectedIds((prev) =>
                    nextChecked
                      ? Array.from(new Set([...prev, member.id]))
                      : prev.filter((id) => id !== member.id),
                  );
                }}
              />
            ))}
          </Flex>
        )}
      </EntityCollectionTemplate>
    </div>
  );
}
