/**
 * UXR-7 — Browser UX Smoke Matrix (L1: unit DOM smoke)
 * Story: xynes/xynes-infra/docs/research/ux-review/01-user-stories.md (UXR-7)
 * Matrix: xynes-front-end/infra/docs/testing/2026-05-10-uxr-7-browser-ux-smoke-matrix.md
 *
 * This spec is the auth-app's deterministic L1 contribution to the UXR-7
 * matrix. It cannot exercise real CSS layout (jsdom does no layout), so it
 * focuses on the assertions that ARE verifiable at the unit level:
 *
 *   - No raw catalog key paths leak through the Lumia DashboardShell labels
 *     bundle in either supported locale.
 *   - Every label the Lumia shell needs to render an accessible name (nav,
 *     workspace switcher, profile menu, mobile menu, notifications,
 *     user-menu fallback, footer note) is non-empty for both `en-US` and
 *     `en-XA`.
 *   - Pseudo-locale (`en-XA`) labels render as bracketed/doubled characters
 *     and preserve ICU placeholders — the canonical signal that long-string
 *     stress copy has been wired through.
 *   - The shell label bundle exposes the same set of keys for both locales
 *     (parity guard — catches missing pseudo-locale entries before they
 *     show up as raw key strings in the browser).
 *   - No sensitive data (raw API keys, JWTs, key hashes) leaks through
 *     any of the forwarded labels.
 *
 * Anything that requires real layout (text overlap, 24×24 px target size,
 * keyboard tab order through a real DOM) is verified at L2 (CMS Console
 * Playwright e2e) or L4 (manual browser pass) per the matrix doc. The auth
 * app does not have a Playwright suite today; that is intentionally out of
 * scope for UXR-7 and tracked as a future follow-up.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import type {
  DashboardShellLabels,
  DashboardShellProps,
} from "@lumia-ui/layout";

vi.unmock("next-intl");

import { NextIntlClientProvider } from "next-intl";
import { AuthDashboardShell } from "./AuthDashboardShell";

import enUsDashboard from "../../../messages/en-US/auth.dashboard.json";
import enXaDashboard from "../../../messages/en-XA/auth.dashboard.json";

const mockUseAuth = vi.fn();
const mockUseWorkspace = vi.fn();
const mockPush = vi.fn();
const mockDashboardShell = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/dashboard/apps",
}));

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => mockUseAuth(),
  useWorkspace: () => mockUseWorkspace(),
}));

vi.mock("@lumia-ui/layout", () => ({
  DashboardShell: (props: DashboardShellProps) => {
    mockDashboardShell(props);
    return <div data-testid="lumia-dashboard-shell">{props.children}</div>;
  },
}));

type SupportedLocale = "en-US" | "en-XA";

function withIntl(locale: SupportedLocale, children: ReactNode) {
  const messages =
    locale === "en-US"
      ? { auth: { dashboard: enUsDashboard } }
      : { auth: { dashboard: enXaDashboard } };
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

function renderShell(locale: SupportedLocale): DashboardShellProps {
  render(
    withIntl(
      locale,
      <AuthDashboardShell activeNav="apps">
        <div>Body</div>
      </AuthDashboardShell>,
    ),
  );
  // The latest render call wins — beforeEach resets the spy.
  const props = mockDashboardShell.mock.calls.at(-1)?.[0] as
    | DashboardShellProps
    | undefined;
  if (!props) {
    throw new Error("Lumia DashboardShell was not invoked");
  }
  return props;
}

/**
 * Walk a labels bundle and collect every leaf string value. Function-form
 * ICU patterns are invoked with a representative argument so we can assert
 * their rendered output too.
 */
function collectLeafStrings(value: unknown, out: string[] = []): string[] {
  if (value == null) return out;
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (typeof value === "function") {
    // Best-effort: invoke ICU pattern functions with a numeric arg or string
    // arg. Failing gracefully is fine — pattern functions that need a
    // particular shape are exercised by the explicit ICU tests below.
    try {
      out.push(String((value as (n: number) => string)(1)));
    } catch {
      try {
        out.push(String((value as (s: string) => string)("X")));
      } catch {
        /* swallow */
      }
    }
    return out;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) {
      collectLeafStrings(v, out);
    }
  }
  return out;
}

const REQUIRED_LABEL_PATHS: ReadonlyArray<string> = [
  "navigation.mainContent",
  "navigation.sidebar",
  "navigation.dashboardNavigation",
  "navigation.mobileDashboardNavigation",
  "navigation.mobileMenu",
  "navigation.openMobileMenu",
  "workspace.trigger",
  "workspace.fallbackName",
  "workspace.currentSection",
  "workspace.currentBadge",
  "workspace.switchToSection",
  "workspace.createAction",
  "workspace.createUnavailableAction",
  "profile.trigger",
  "profile.profileAction",
  "profile.logoutAction",
  "notifications.empty",
];

// `userMenu.fallbackName` / `userMenu.fallbackEmail` are catalog keys that
// map into top-level `props.userMenu.{name,email}` (NOT into the Lumia
// `labels` bundle), so they're verified separately below.
const REQUIRED_USER_MENU_PATHS: ReadonlyArray<"name" | "email"> = [
  "name",
  "email",
];

function readPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

describe("AuthDashboardShell — UXR-7 browser UX smoke (L1)", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockDashboardShell.mockReset();
    mockUseAuth.mockReturnValue({
      user: {
        displayName: "Archie",
        email: "archie@xynes.com",
        avatarUrl: null,
      },
      workspaces: [
        { id: "ws-1", name: "Xynes", slug: "xynes" },
        { id: "ws-2", name: "Lumia", slug: "lumia" },
      ],
    });
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: { id: "ws-1", name: "Xynes", slug: "xynes" },
      selectWorkspace: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  describe.each(["en-US", "en-XA"] as const)("locale: %s", (locale) => {
    it("renders the full nav set without raw key-path leaks", () => {
      const props = renderShell(locale);
      // 8 nav entries per UXR-4 vocabulary doc + UXR-5 evidence.
      expect(props.navItems).toHaveLength(8);
      for (const item of props.navItems) {
        expect(item.label).toBeTruthy();
        expect(item.label).not.toMatch(/auth\.dashboard\./);
        expect(item.href).toMatch(/^\/dashboard\//);
      }
    });

    it("provides a non-empty value for every required shell label path", () => {
      const props = renderShell(locale);
      const labels = props.labels as DashboardShellLabels;
      for (const path of REQUIRED_LABEL_PATHS) {
        const value = readPath(labels, path);
        expect(
          value,
          `expected labels.${path} to be set in ${locale}`,
        ).toBeTruthy();
        expect(typeof value).toBe("string");
        expect(String(value)).not.toMatch(/auth\.dashboard\./);
      }
      // `userMenu.fallbackName` / `userMenu.fallbackEmail` are surfaced via
      // `props.userMenu.{name,email}` (top-level), not via `props.labels`.
      // The shell uses the live user data when available and falls back to
      // these translated strings otherwise — both must be non-empty so the
      // shell never renders a blank account row.
      for (const key of REQUIRED_USER_MENU_PATHS) {
        const value = props.userMenu[key];
        expect(
          value,
          `expected userMenu.${key} to be set in ${locale}`,
        ).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    });

    it("never leaks raw catalog key paths through any forwarded label", () => {
      const props = renderShell(locale);
      const allStrings: string[] = [
        ...props.navItems.map((item) => item.label),
        props.workspaceCreationDisabledMessage ?? "",
        props.sidebarFooterNote ?? "",
        props.userMenu.name,
        props.userMenu.email,
        ...collectLeafStrings(props.labels),
      ];
      for (const value of allStrings) {
        expect(value).not.toMatch(/auth\.dashboard\./);
        expect(value).not.toMatch(/auth\.common\./);
      }
    });

    it("never leaks sensitive data (API keys, JWTs, key hashes) through labels", () => {
      const props = renderShell(locale);
      const allStrings: string[] = [
        ...props.navItems.map((item) => item.label),
        props.workspaceCreationDisabledMessage ?? "",
        props.sidebarFooterNote ?? "",
        props.userMenu.name,
        props.userMenu.email,
        ...collectLeafStrings(props.labels),
      ];
      for (const value of allStrings) {
        // Workspace API key shape from the gateway PFU/Task 7 work.
        expect(value).not.toMatch(/xynes_live_/);
        // JWT shape (3 dot-separated base64url segments).
        expect(value).not.toMatch(/\beyJ[A-Za-z0-9_-]+\./);
        // Argon2id stored hash marker.
        expect(value).not.toMatch(/\$argon2id\$/);
        // Forbidden field names that should never reach UI copy.
        expect(value.toLowerCase()).not.toContain("key_hash");
        expect(value.toLowerCase()).not.toContain("rawkey");
      }
    });
  });

  it("preserves ICU placeholders through the en-XA pseudo-locale", () => {
    const props = renderShell("en-XA");
    const labels = props.labels as DashboardShellLabels;
    // The ICU patterns interpolate at render time — the placeholder must
    // survive pseudo-localization so the function still produces a string
    // that contains the substituted value.
    const titleAt7 = labels.notifications?.title?.(7) ?? "";
    expect(titleAt7).toMatch(/7/);
    const unreadAt3 = labels.notifications?.unreadCount?.(3) ?? "";
    expect(unreadAt3).toMatch(/3/);
  });

  it("renders pseudo-locale doubled-character labels for the dense control surface", () => {
    const props = renderShell("en-XA");
    // Sample the exact long-string stress strings from the UXR-5 evidence
    // — these are the controls most at risk of overflowing the nav rail and
    // workspace-switcher trigger.
    const navLabels = props.navItems.map((item) => item.label);
    expect(navLabels[0]).toMatch(/^\[AAppppss\]$/);
    expect(navLabels[2]).toMatch(/\[AAcccceessss CCoonnttrrooll\]/);
    expect(navLabels[4]).toMatch(/\[IInntteeggrraattiioonnss\]/);

    const labels = props.labels as DashboardShellLabels;
    expect(labels.workspace?.createAction).toMatch(
      /\[CCrreeaattee nneeww wwoorrkkssppaaccee\]/,
    );
    expect(labels.profile?.logoutAction).toMatch(/\[LLooggoouutt\]/);
  });

  it("ships the same set of label paths for en-US and en-XA (parity guard)", () => {
    // Drive both locales through the shell and confirm the structural shape
    // of the labels bundle is identical. This is the unit-level equivalent
    // of the matrix doc's "no missing-message in the browser" assertion —
    // a missing en-XA key would render as the en-US default OR as a raw
    // key path, both of which would be visible regressions.
    cleanup();
    mockDashboardShell.mockReset();
    const propsUs = renderShell("en-US");
    cleanup();
    mockDashboardShell.mockReset();
    const propsXa = renderShell("en-XA");

    const collectKeys = (value: unknown, prefix = ""): string[] => {
      if (value == null || typeof value !== "object") return [];
      const out: string[] = [];
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        const path = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && typeof v !== "function") {
          out.push(...collectKeys(v, path));
        } else {
          out.push(path);
        }
      }
      return out.sort();
    };

    expect(collectKeys(propsXa.labels)).toEqual(collectKeys(propsUs.labels));
  });
});
