import type { ReactNode } from "react";
import type { ViewMode } from "@lumia-ui/components";

export type EntityCollectionTab = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type EntityCollectionSortOption = {
  value: string;
  label: string;
};

export interface EntityCollectionTemplateProps {
  tabs: EntityCollectionTab[];
  activeTab: string;
  onTabChange: (value: string) => void;
  searchValue: string;
  onSearchValueChange: (nextValue: string) => void;
  onSearchSubmit: () => void;
  searchPlaceholder?: string;
  searchDisabled?: boolean;
  totalResults: number;
  selectAllChecked: boolean;
  onSelectAllChange: (nextChecked: boolean) => void;
  selectAllDisabled?: boolean;
  sortValue: string;
  sortOptions: EntityCollectionSortOption[];
  onSortChange: (nextSort: string) => void;
  sortDisabled?: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  children: ReactNode;
}
