"use client";

import { NoResults } from "@lumia-ui/components";

interface DashboardNoResultsProps {
  query: string;
  onClear: () => void;
}

export function DashboardNoResults({ query, onClear }: DashboardNoResultsProps) {
  return (
    <NoResults
      title="No apps found"
      description={`No installed apps match "${query.trim()}".`}
      primaryAction={{
        label: "Clear search",
        onClick: onClear,
      }}
      resetHint="Try a different keyword or clear the search."
      className="mt-6"
    />
  );
}

export type { DashboardNoResultsProps };
