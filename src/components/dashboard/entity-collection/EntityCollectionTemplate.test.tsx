import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EntityCollectionTemplate } from "./EntityCollectionTemplate";

describe("EntityCollectionTemplate", () => {
  it("renders optional search leading action", () => {
    render(
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
        searchLeadingAction={
          <button type="button" aria-label="Invite people">
            Invite
          </button>
        }
      >
        <div>Content</div>
      </EntityCollectionTemplate>,
    );

    expect(
      screen.getByRole("button", { name: "Invite people" }),
    ).toBeInTheDocument();
  });

  it("supports custom aria labels", () => {
    render(
      <EntityCollectionTemplate
        tabs={[{ value: "users", label: "Users" }]}
        activeTab="users"
        onTabChange={vi.fn()}
        searchValue=""
        onSearchValueChange={vi.fn()}
        onSearchSubmit={vi.fn()}
        totalResults={2}
        selectAllChecked={false}
        onSelectAllChange={vi.fn()}
        sortValue="name_asc"
        sortOptions={[{ value: "name_asc", label: "Name (A-Z)" }]}
        onSortChange={vi.fn()}
        viewMode="grid"
        onViewModeChange={vi.fn()}
        searchAriaLabel="Search for users"
        selectAllAriaLabel="Select all users"
        sortAriaLabel="Sort users"
      >
        <div>Content</div>
      </EntityCollectionTemplate>,
    );

    expect(screen.getByLabelText("Search for users")).toBeInTheDocument();
    expect(screen.getByLabelText("Select all users")).toBeInTheDocument();
    expect(screen.getByLabelText("Sort users")).toBeInTheDocument();
  });

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
