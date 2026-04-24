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

  it("routes users with 0 workspaces to onboarding even when a safe dashboard redirect is provided", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [],
        redirectParam: "http://localhost:3000/dashboard/xynes-studio-llp/content",
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/onboarding");
  });

  it("allows non-dashboard redirects such as invite acceptance when user has 0 workspaces", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [],
        redirectParam: "/invite/test",
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("/invite/test");
  });

  it("prefers a safe redirect param when the user has at least one workspace", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [{ slug: "ws-1" }],
        redirectParam: "http://localhost:3000/dashboard/xynes-studio-llp/content",
        allowedRedirectDomains: allowedDomains,
      }),
    ).toBe("http://localhost:3000/dashboard/xynes-studio-llp/content");
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

  it("prioritizes complete-profile when display name is missing", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [{ slug: "ws-1" }],
        redirectParam: "/dashboard/apps",
        allowedRedirectDomains: allowedDomains,
        requiresProfileCompletion: true,
      }),
    ).toBe("/complete-profile?redirect=%2Fdashboard%2Fapps");
  });

  it("routes profile completion back to onboarding when user has 0 workspaces", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [],
        redirectParam: "http://localhost:3000/dashboard/xynes-studio-llp/content",
        allowedRedirectDomains: allowedDomains,
        requiresProfileCompletion: true,
      }),
    ).toBe("/complete-profile?redirect=%2Fonboarding");
  });

  it("does not route to complete-profile when display name is already present", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [{ slug: "ws-1" }],
        redirectParam: "/dashboard/apps",
        allowedRedirectDomains: allowedDomains,
        requiresProfileCompletion: false,
      }),
    ).toBe("/dashboard/apps");
  });

  it("avoids complete-profile redirect loops", () => {
    expect(
      determinePostLoginDestination({
        workspaces: [{ slug: "ws-1" }],
        redirectParam: "/complete-profile",
        allowedRedirectDomains: allowedDomains,
        requiresProfileCompletion: true,
      }),
    ).toBe("/complete-profile");
  });
});
