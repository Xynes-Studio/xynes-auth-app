/**
 * I18n + pseudo-locale tests for AuthDashboardShell (UXR-5).
 *
 * Uses the real `next-intl` provider (un-mocking the global next-intl mock
 * from `src/test/setup.ts`) so we can verify that the auth.dashboard catalog
 * flows through the Lumia DashboardShell label bundle and that the en-XA
 * pseudo-locale renders accented/doubled characters without breaking the
 * shell shape.
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
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
  usePathname: () => "/dashboard/apps",
  useSearchParams: () => new URLSearchParams(""),
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

vi.mock("@lumia-ui/components", () => ({
  useToast: () => ({ show: vi.fn(), dismiss: vi.fn() }),
}));

function withIntl(locale: "en-US" | "en-XA", children: ReactNode) {
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

describe("AuthDashboardShell i18n (UXR-5)", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockDashboardShell.mockReset();
    mockUseAuth.mockReturnValue({
      user: { displayName: "Archie", email: "archie@xynes.com", avatarUrl: null },
      workspaces: [{ id: "ws-1", name: "Xynes", slug: "xynes" }],
    });
    mockUseWorkspace.mockReturnValue({
      currentWorkspace: { id: "ws-1", name: "Xynes", slug: "xynes" },
      selectWorkspace: vi.fn(),
    });
  });

  afterEach(() => cleanup());

  it("renders en-US navigation labels and shell labels from the auth.dashboard catalog", () => {
    render(
      withIntl(
        "en-US",
        <AuthDashboardShell activeNav="apps">
          <div>Body</div>
        </AuthDashboardShell>,
      ),
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
    const navLabels = props.navItems.map((item) => item.label);
    expect(navLabels).toEqual([
      "Apps",
      "Directory",
      "Access Control",
      "Security",
      "Integrations",
      "Logs",
      "Billing",
      "Settings",
    ]);

    const labels = props.labels as DashboardShellLabels;
    expect(labels.navigation?.mainContent).toBe("Dashboard main content");
    expect(labels.workspace?.currentSection).toBe("Current Workspace");
    expect(labels.profile?.logoutAction).toBe("Logout");
    expect(labels.notifications?.empty).toBe("No notifications");
    // ICU pattern interpolation
    expect(labels.notifications?.title?.(2)).toBe("Notifications (2)");
  });

  it("renders en-XA pseudo-locale navigation + shell labels (long-string stress test)", () => {
    render(
      withIntl(
        "en-XA",
        <AuthDashboardShell activeNav="apps">
          <div>Body</div>
        </AuthDashboardShell>,
      ),
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
    // Pseudo-locale wraps + doubles characters: "Apps" -> "[AAppppss]".
    const navLabels = props.navItems.map((item) => item.label);
    expect(navLabels[0]).toMatch(/^\[AAppppss\]$/);
    expect(navLabels[2]).toMatch(/\[AAcccceessss CCoonnttrrooll\]/);
    expect(navLabels[4]).toMatch(/\[IInntteeggrraattiioonnss\]/);

    const labels = props.labels as DashboardShellLabels;
    expect(labels.profile?.logoutAction).toMatch(/\[LLooggoouutt\]/);
    expect(labels.workspace?.createAction).toMatch(
      /\[CCrreeaattee nneeww wwoorrkkssppaaccee\]/,
    );
    // ICU placeholder is preserved (the pseudo-localizer leaves {unreadCount}
    // intact). The function-form in the en-XA catalog should still
    // interpolate the placeholder at render time.
    expect(labels.notifications?.title?.(7)).toMatch(/7/);

    // Sentinel: no raw key path leaks (e.g. "auth.dashboard.shell.profile").
    expect(labels.profile?.trigger).not.toMatch(/auth\./);
  });

  it("never leaks raw catalog key paths through any forwarded label", () => {
    render(
      withIntl(
        "en-US",
        <AuthDashboardShell activeNav="apps">
          <div>Body</div>
        </AuthDashboardShell>,
      ),
    );

    const props = mockDashboardShell.mock.calls[0][0] as DashboardShellProps;
    const stringValues: string[] = [
      ...props.navItems.map((item) => item.label),
      props.workspaceCreationDisabledMessage ?? "",
      props.sidebarFooterNote ?? "",
      props.userMenu.name,
      props.userMenu.email,
    ];
    for (const value of stringValues) {
      expect(value).not.toMatch(/auth\.dashboard\./);
    }
  });

  it("exposes the BUG-AUTH-3b logout toast copy keys in both en-US and en-XA catalogs", () => {
    // Parity guard: the AuthDashboardShell binds these keys via
    // `useTranslations("auth.dashboard.shell.logout")`. If a future
    // refactor renames the namespace or drops a key, the shell render in
    // production would crash with a MISSING_MESSAGE error. Asserting on the
    // imported catalog objects directly catches the regression at test
    // time without needing to mount the toast UI.
    const enUsLogout = (
      enUsDashboard as unknown as {
        shell: {
          logout: {
            successTitle: string;
            successDescription: string;
            errorTitle: string;
            errorDescription: string;
          };
        };
      }
    ).shell.logout;
    expect(enUsLogout.successTitle).toBe("You've been signed out.");
    expect(enUsLogout.successDescription).toBe(
      "Redirecting you to the login page…",
    );
    expect(enUsLogout.errorTitle).toBe("We couldn't sign you out.");
    expect(enUsLogout.errorDescription).toBe(
      "Check your connection and try again.",
    );

    const enXaLogout = (
      enXaDashboard as unknown as {
        shell: { logout: Record<string, string> };
      }
    ).shell.logout;
    // Pseudo-locale wraps + doubles characters; the key set must match en-US.
    expect(Object.keys(enXaLogout).sort()).toEqual(
      Object.keys(enUsLogout).sort(),
    );
    expect(enXaLogout.successTitle).toMatch(/\[.+\]/);
    expect(enXaLogout.errorTitle).toMatch(/\[.+\]/);
  });
});
