"use client";

import {
  Button,
  Checkbox,
  Flex,
  Input,
  Select,
  Tabs,
  TabsList,
  TabsTrigger,
  ViewToggle,
} from "@lumia-ui/components";
import type { EntityCollectionTemplateProps } from "./types";

export function EntityCollectionTemplate({
  tabs,
  activeTab,
  onTabChange,
  searchLeadingAction,
  searchValue,
  onSearchValueChange,
  onSearchSubmit,
  searchPlaceholder = "Search for apps",
  searchAriaLabel = "Search for apps",
  searchDisabled = false,
  totalResults,
  selectAllChecked,
  onSelectAllChange,
  selectAllAriaLabel = "Select all apps",
  selectAllDisabled = false,
  sortValue,
  sortOptions,
  onSortChange,
  sortAriaLabel = "Sort apps",
  sortDisabled = false,
  viewMode,
  onViewModeChange,
  children,
}: EntityCollectionTemplateProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <Flex
        direction={{ base: "col", md: "row" }}
        align="stretch"
        justify="start"
        className="w-full gap-3 md:items-center md:justify-between md:gap-4"
      >
        <div className="w-full md:w-auto">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsList>
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  disabled={tab.disabled}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <form
          className="flex w-full items-center gap-2 md:w-auto md:justify-end"
          onSubmit={(event) => {
            event.preventDefault();
            onSearchSubmit();
          }}
        >
          {searchLeadingAction}
          <div className="min-w-0 flex-1 md:w-[360px]">
            <Input
              value={searchValue}
              onChange={(event) => onSearchValueChange(event.currentTarget.value)}
              placeholder={searchPlaceholder}
              aria-label={searchAriaLabel}
              disabled={searchDisabled}
            />
          </div>
          <Button type="submit" disabled={searchDisabled}>
            Search
          </Button>
        </form>
      </Flex>

      <div className="mt-6 flex h-[calc(100svh-14rem)] min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card md:h-auto md:flex-1">
        <Flex
          align="center"
          justify="between"
          className="border-b border-border px-4 py-3"
        >
          <label className="inline-flex items-center gap-2">
            <Checkbox
              checked={selectAllChecked}
              onChange={(event) =>
                onSelectAllChange(event.currentTarget.checked)
              }
              aria-label={selectAllAriaLabel}
              disabled={selectAllDisabled}
            />
            <span className="text-sm font-medium text-foreground">
              Select All
            </span>
          </label>
          <div>
            <ViewToggle mode={viewMode} onChange={onViewModeChange} />
          </div>
        </Flex>

        <Flex align="center" justify="between" className="px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">
              {totalResults}
            </span>{" "}
            Found
          </p>
          <div className="w-[180px]">
            <Select
              aria-label={sortAriaLabel}
              value={sortValue}
              onChange={(event) => onSortChange(event.currentTarget.value)}
              disabled={sortDisabled}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </Flex>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border p-4">
          {children}
        </div>
      </div>
    </section>
  );
}
