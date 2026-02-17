"use client";

import { useEffect, useMemo, useState } from "react";
import { AppTile, Flex, type ViewMode } from "@lumia-ui/components";
import { useWorkspace } from "@xynes/auth-sdk";
import { UnderDevelopmentPanel } from "@/app/dashboard/components/UnderDevelopmentPanel";
import {
  DashboardNoResults,
  EntityCollectionTemplate,
  useDebouncedValue,
  type EntityCollectionSortOption,
} from "@/components/dashboard";
import {
  buildCmsLaunchUrl,
  filterAppsByQuery,
  getAppsUiState,
  sortApps,
  type AppsSortOption,
} from "@/lib/dashboard/apps/apps-catalog";
import { INSTALLED_APPS } from "./apps-static-data";

type AppsTab = "installed" | "marketplace";

const SORT_OPTIONS: EntityCollectionSortOption[] = [
  { value: "date_desc", label: "Date (Newest)" },
  { value: "date_asc", label: "Date (Oldest)" },
  { value: "name_asc", label: "Name (A-Z)" },
  { value: "name_desc", label: "Name (Z-A)" },
];

export function AppsDashboardContent() {
  const { currentWorkspace } = useWorkspace();
  const [activeTab, setActiveTab] = useState<AppsTab>("installed");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortValue, setSortValue] = useState<AppsSortOption>("date_desc");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    if (activeTab !== "installed") {
      return;
    }
    setQuery(debouncedSearch);
  }, [activeTab, debouncedSearch]);

  const searchDisabled = activeTab === "marketplace";
  const filteredInstalledApps = useMemo(() => {
    const filtered = filterAppsByQuery(INSTALLED_APPS, query);
    return sortApps(filtered, sortValue);
  }, [query, sortValue]);
  const resultCount =
    activeTab === "installed" ? filteredInstalledApps.length : 0;
  const uiState = getAppsUiState(resultCount);

  useEffect(() => {
    const filteredIds = new Set(filteredInstalledApps.map((item) => item.id));
    setSelectedIds((prev) => prev.filter((id) => filteredIds.has(id)));
  }, [filteredInstalledApps]);

  const allSelected =
    filteredInstalledApps.length > 0 &&
    filteredInstalledApps.every((item) => selectedIds.includes(item.id));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <EntityCollectionTemplate
        tabs={[
          { value: "installed", label: "Installed" },
          { value: "marketplace", label: "Marketplace" },
        ]}
        activeTab={activeTab}
        onTabChange={(value) => setActiveTab(value as AppsTab)}
        searchValue={searchInput}
        onSearchValueChange={setSearchInput}
        onSearchSubmit={() => setQuery(searchInput)}
        searchDisabled={searchDisabled}
        totalResults={resultCount}
        selectAllChecked={allSelected}
        onSelectAllChange={(nextChecked) => {
          if (!nextChecked) {
            setSelectedIds([]);
            return;
          }
          setSelectedIds(filteredInstalledApps.map((item) => item.id));
        }}
        selectAllDisabled={searchDisabled || uiState.isSelectAllDisabled}
        sortValue={sortValue}
        sortOptions={SORT_OPTIONS}
        onSortChange={(nextSort) => setSortValue(nextSort as AppsSortOption)}
        sortDisabled={searchDisabled || uiState.isSortDisabled}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        {activeTab === "marketplace" ? (
          <UnderDevelopmentPanel
            title="Marketplace is under development"
            description="Marketplace app installation is coming soon."
          />
        ) : filteredInstalledApps.length === 0 ? (
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
            {filteredInstalledApps.map((item) => (
              <AppTile
                key={item.id}
                tileId={item.id}
                view={viewMode}
                title={item.title}
                avatarSrc={item.avatarSrc}
                selectable
                selected={selectedIds.includes(item.id)}
                onSelectedChange={(nextChecked) => {
                  setSelectedIds((prev) =>
                    nextChecked
                      ? Array.from(new Set([...prev, item.id]))
                      : prev.filter((id) => id !== item.id),
                  );
                }}
                onActivate={() => {
                  const url = buildCmsLaunchUrl(currentWorkspace?.slug);
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
              />
            ))}
          </Flex>
        )}
      </EntityCollectionTemplate>
    </div>
  );
}
