/**
 * OnboardingScreen i18n test
 *
 * Verifies the BUG-AUTH-1 (2026-05-30) i18n migration: the `/onboarding`
 * surface resolves all visible copy through the `auth.onboarding` namespace
 * and renders correctly under both the canonical en-US catalog and the
 * en-XA pseudo-locale. The pseudo-locale wraps every leaf string in `[..]`
 * and doubles every character, so the catalog values must round-trip
 * through `NextIntlClientProvider` without leaking raw catalog-key paths.
 *
 * Pattern follows `LoginForm.i18n.test.tsx` byte-for-byte:
 *   1. `vi.unmock("next-intl")` so the real provider is exercised.
 *   2. Wrap with `<NextIntlClientProvider>` per render.
 *   3. CreateWorkspaceForm is mocked so this test stays focused on the
 *      screen-level header + footer chrome and does not duplicate the
 *      coverage that `CreateWorkspaceForm.integration.test.tsx` already has.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

// Mock CreateWorkspaceForm so this test doesn't need the supabase + form deps.
vi.mock("./CreateWorkspaceForm", () => ({
  CreateWorkspaceForm: ({ redirectUrl }: { redirectUrl?: string }) => (
    <div
      data-testid="create-workspace-form-stub"
      data-redirect-url={redirectUrl ?? ""}
    />
  ),
}));

// Use the real next-intl provider so pseudo-locale strings render through the
// real catalog selection path.
vi.unmock("next-intl");

import { NextIntlClientProvider } from "next-intl";
import { OnboardingScreen } from "./OnboardingScreen";

import enUsOnboarding from "../../../messages/en-US/auth.onboarding.json";
import enXaOnboarding from "../../../messages/en-XA/auth.onboarding.json";

function withIntl(locale: "en-US" | "en-XA", children: ReactNode) {
  const messages =
    locale === "en-US"
      ? { auth: { onboarding: enUsOnboarding } }
      : { auth: { onboarding: enXaOnboarding } };
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

describe("OnboardingScreen — auth.onboarding i18n contract", () => {
  beforeEach(() => {
    cleanup();
  });
  afterEach(() => cleanup());

  describe("en-US (default)", () => {
    it("renders the tight page header from the catalog", () => {
      render(withIntl("en-US", <OnboardingScreen />));

      expect(
        screen.getByRole("heading", { level: 1, name: /create your workspace/i }),
      ).toBeInTheDocument();
      // Subtitle: catalog source of truth.
      expect(
        screen.getByText(/your team's home for everything xynes\./i),
      ).toBeInTheDocument();
    });

    it("renders the help footer through the catalog with safe external link contracts", () => {
      render(withIntl("en-US", <OnboardingScreen />));

      // Help prompt.
      expect(screen.getByText(/need help\?/i)).toBeInTheDocument();

      // Docs link — opens in a new tab with safe rel.
      const docs = screen.getByRole("link", { name: /documentation/i });
      expect(docs).toHaveAttribute("href", "https://docs.xynes.com");
      expect(docs).toHaveAttribute("target", "_blank");
      expect(docs).toHaveAttribute("rel", "noopener noreferrer");

      // Support link — mailto, no target=_blank required.
      const support = screen.getByRole("link", { name: /contact support/i });
      expect(support).toHaveAttribute("href", "mailto:support@xynes.com");
    });

    it("forwards the redirectUrl prop to CreateWorkspaceForm unchanged", () => {
      render(
        withIntl(
          "en-US",
          <OnboardingScreen redirectUrl="https://cms.xynes.com/dashboard" />,
        ),
      );
      const stub = screen.getByTestId("create-workspace-form-stub");
      expect(stub).toHaveAttribute(
        "data-redirect-url",
        "https://cms.xynes.com/dashboard",
      );
    });

    it("does NOT carry any marketing copy lifted from the legacy hero block", () => {
      render(withIntl("en-US", <OnboardingScreen />));

      // BUG-AUTH-1 retired: oversized "Welcome to Xynes" header.
      expect(screen.queryByText(/welcome to xynes/i)).not.toBeInTheDocument();
      // BUG-AUTH-1 retired: marketing-style subtitle.
      expect(
        screen.queryByText(/invite your team and start collaborating/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("en-XA (pseudo-locale)", () => {
    it("renders the heading via the pseudo-locale catalog (proves real catalog selection)", () => {
      render(withIntl("en-XA", <OnboardingScreen />));

      // Pseudo-locale doubles every letter and brackets the whole string.
      // e.g. en-US "Create your workspace" → "[CCrreeaattee yyoouurr wwoorrkkssppaaccee]"
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading.textContent).toMatch(/^\[/);
      expect(heading.textContent).toMatch(/\]$/);
      // Sanity: a non-ASCII or doubled-letter signature is present somewhere.
      expect(heading.textContent).toMatch(/CCrreeaattee/);
    });

    it("never leaks a raw catalog-key path to the DOM in either locale", () => {
      const renderAndCheck = (locale: "en-US" | "en-XA") => {
        const { container } = render(
          withIntl(locale, <OnboardingScreen />),
        );
        // Any literal "auth.onboarding.X" substring in the rendered DOM would
        // mean a missing-message fallback. The contract: catalogs ALWAYS
        // resolve.
        expect(container.textContent ?? "").not.toMatch(/auth\.onboarding\./);
        cleanup();
      };
      renderAndCheck("en-US");
      renderAndCheck("en-XA");
    });
  });

  describe("catalog parity (BUG-AUTH-1 invariant)", () => {
    it("en-US and en-XA carry the same key tree", () => {
      const collectKeys = (
        node: unknown,
        prefix = "",
      ): string[] => {
        if (node === null || node === undefined) return [];
        if (typeof node !== "object") return [prefix];
        return Object.entries(node as Record<string, unknown>).flatMap(
          ([k, v]) => collectKeys(v, prefix ? `${prefix}.${k}` : k),
        );
      };
      const enUsKeys = collectKeys(enUsOnboarding).sort();
      const enXaKeys = collectKeys(enXaOnboarding).sort();
      expect(enXaKeys).toEqual(enUsKeys);
    });
  });
});
