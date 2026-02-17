import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EntityCollectionTemplate } from "./EntityCollectionTemplate";

describe("EntityCollectionTemplate", () => {
  it("uses theme-aware surface and border classes", () => {
    const { container } = render(
      <EntityCollectionTemplate
        tabs={[{ value: "installed", label: "Installed" }]}
        activeTab="installed"
        onTabChange={vi.fn()}
        searchValue=""
        onSearchValueChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        totalResults={1}
        selectAllChecked={false}
        onSelectAllChange={vi.fn()}
        sortValue="date_desc"
        sortOptions={[{ value: "date_desc", label: "Date (Newest)" }]}
        onSortChange={vi.fn()}
        viewMode="grid"
        onViewModeChange={vi.fn()}
      >
        <div>Content</div>
      </EntityCollectionTemplate>,
    );

    const root = container.querySelector("section");
    const surface = screen.getByText("Select All").closest("div")?.parentElement;

    expect(root).toBeTruthy();
    expect(root?.className).toContain("bg-background");
    expect(surface).toBeTruthy();
    expect(surface?.className).toContain("bg-card");
    expect(surface?.className).toContain("border-border");
  });
});
