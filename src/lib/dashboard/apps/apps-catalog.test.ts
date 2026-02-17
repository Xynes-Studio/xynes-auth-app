import { describe, expect, it } from "vitest";
import {
  buildCmsLaunchUrl,
  filterAppsByQuery,
  getAppsUiState,
  sortApps,
  type AppCatalogItem,
  type AppsSortOption,
} from "./apps-catalog";

const FIXED_APPS: AppCatalogItem[] = [
  {
    id: "cms",
    title: "Xynes CMS",
    avatarSrc: "https://avatar.vercel.sh/xynes-cms",
    installedAt: "2026-02-15T10:00:00.000Z",
  },
  {
    id: "crm",
    title: "Xynes CRM",
    avatarSrc: "https://avatar.vercel.sh/xynes-crm",
    installedAt: "2026-02-14T10:00:00.000Z",
  },
  {
    id: "chat",
    title: "Xynes Chat",
    avatarSrc: "https://avatar.vercel.sh/xynes-chat",
    installedAt: "2026-02-16T10:00:00.000Z",
  },
];

describe("filterAppsByQuery", () => {
  it("returns all apps for empty query", () => {
    expect(filterAppsByQuery(FIXED_APPS, "")).toEqual(FIXED_APPS);
    expect(filterAppsByQuery(FIXED_APPS, "   ")).toEqual(FIXED_APPS);
  });

  it("filters by title case-insensitively", () => {
    expect(filterAppsByQuery(FIXED_APPS, "cms")).toEqual([FIXED_APPS[0]]);
    expect(filterAppsByQuery(FIXED_APPS, "CRM")).toEqual([FIXED_APPS[1]]);
  });
});

describe("sortApps", () => {
  const assertOrder = (option: AppsSortOption, expectedIds: string[]) => {
    const sorted = sortApps(FIXED_APPS, option);
    expect(sorted.map((item) => item.id)).toEqual(expectedIds);
  };

  it("sorts by newest date first", () => {
    assertOrder("date_desc", ["chat", "cms", "crm"]);
  });

  it("sorts by oldest date first", () => {
    assertOrder("date_asc", ["crm", "cms", "chat"]);
  });

  it("sorts by name ascending", () => {
    assertOrder("name_asc", ["chat", "cms", "crm"]);
  });

  it("sorts by name descending", () => {
    assertOrder("name_desc", ["crm", "cms", "chat"]);
  });
});

describe("buildCmsLaunchUrl", () => {
  it("builds workspace-scoped localhost URL for valid slug", () => {
    expect(buildCmsLaunchUrl("acme-team")).toBe("http://localhost:3000/acme-team");
  });

  it("falls back to root URL when slug is missing or invalid", () => {
    expect(buildCmsLaunchUrl("")).toBe("http://localhost:3000");
    expect(buildCmsLaunchUrl("   ")).toBe("http://localhost:3000");
    expect(buildCmsLaunchUrl("not valid slug")).toBe("http://localhost:3000");
    expect(buildCmsLaunchUrl("../hack")).toBe("http://localhost:3000");
  });
});

describe("getAppsUiState", () => {
  it("disables select-all and sort when one or fewer items are present", () => {
    expect(getAppsUiState(0)).toEqual({
      isSelectAllDisabled: true,
      isSortDisabled: true,
    });
    expect(getAppsUiState(1)).toEqual({
      isSelectAllDisabled: true,
      isSortDisabled: true,
    });
  });

  it("enables select-all and sort when multiple items are present", () => {
    expect(getAppsUiState(2)).toEqual({
      isSelectAllDisabled: false,
      isSortDisabled: false,
    });
  });
});
