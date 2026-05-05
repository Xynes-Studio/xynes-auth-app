import { describe, expect, it } from "vitest";
import {
  buildCmsWorkspaceContentPath,
  buildCmsWorkspaceContentUrl,
  normalizeConsoleBaseUrl,
  normalizeWorkspaceSlugForCmsPath,
  WORKSPACE_ADMIN_FALLBACK_PATH,
} from "./console-url";

describe("workspace console URL helpers", () => {
  it("normalizes valid workspace slugs for CMS paths", () => {
    expect(normalizeWorkspaceSlugForCmsPath("Acme-Team")).toBe("acme-team");
    expect(normalizeWorkspaceSlugForCmsPath(" acme-team ")).toBe("acme-team");
  });

  it("rejects unsafe workspace slugs", () => {
    expect(normalizeWorkspaceSlugForCmsPath("../hack")).toBeNull();
    expect(normalizeWorkspaceSlugForCmsPath("not valid")).toBeNull();
    expect(normalizeWorkspaceSlugForCmsPath("1starts-with-number")).toBeNull();
  });

  it("builds the canonical CMS content path", () => {
    expect(buildCmsWorkspaceContentPath("acme-team")).toBe(
      "/dashboard/acme-team/content",
    );
  });

  it("normalizes HTTP console base URLs", () => {
    expect(normalizeConsoleBaseUrl("https://cms.xynes.com/")).toBe(
      "https://cms.xynes.com",
    );
    expect(normalizeConsoleBaseUrl("http://localhost:3000///")).toBe(
      "http://localhost:3000",
    );
  });

  it("rejects unsafe console base URLs", () => {
    expect(normalizeConsoleBaseUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeConsoleBaseUrl("//evil.test")).toBeNull();
  });

  it("builds canonical CMS workspace content URLs", () => {
    expect(
      buildCmsWorkspaceContentUrl({
        baseUrl: "http://localhost:3000",
        workspaceSlug: "acme-team",
      }),
    ).toBe("http://localhost:3000/dashboard/acme-team/content");
  });

  it("falls back to workspace admin when URL parts are invalid", () => {
    expect(
      buildCmsWorkspaceContentUrl({
        baseUrl: "http://localhost:3000",
        workspaceSlug: "../hack",
      }),
    ).toBe(WORKSPACE_ADMIN_FALLBACK_PATH);
    expect(
      buildCmsWorkspaceContentUrl({
        baseUrl: "",
        workspaceSlug: "acme-team",
      }),
    ).toBe(WORKSPACE_ADMIN_FALLBACK_PATH);
  });
});
