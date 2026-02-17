import { describe, expect, it } from "vitest";
import { determinePostLoginDestination } from "./post-login-destination";

describe("determinePostLoginDestination", () => {
  const allowedDomains = ["xynes.com", "localhost:3000"];

  it("returns /onboarding when user has 0 workspaces", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [],
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/onboarding");
  });

  it("returns /workspaces when user has 2+ workspaces", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [{ slug: "ws-1" }, { slug: "ws-2" }],
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/dashboard/apps");
  });

  it("returns dashboard users page for 1 workspace", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [{ slug: "My Workspace!" }],
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/dashboard/apps");
  });

  it("falls back to dashboard users page when console URL is missing or not allowed", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [{ slug: "Acme" }],
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/dashboard/apps");
  });

  it("prefers a safe redirect param when provided", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [],
        redirectParam: "/workspaces",
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/workspaces");
  });

  it("falls back to default destination for unsafe redirect param", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [],
        redirectParam: "javascript:alert(1)",
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/onboarding");
  });

  it("avoids redirect loops back to /login", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [{ slug: "ws" }],
        redirectParam: "/login",
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/dashboard/apps");
  });
});
