/**
 * ProfileComingSoon i18n + behaviour test
 *
 * Verifies the BUG-AUTH-3a placeholder route resolves all visible copy
 * through the `auth.profile` namespace and renders correctly under both the
 * canonical en-US catalog and the en-XA pseudo-locale. Pattern follows
 * `OnboardingScreen.i18n.test.tsx` byte-for-byte:
 *   1. `vi.unmock("next-intl")` so the real provider is exercised.
 *   2. Wrap with `<NextIntlClientProvider>` per render.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

// Use the real next-intl provider so pseudo-locale strings render through
// the real catalog selection path. The global vitest setup mocks next-intl
// with a synchronous stub; we override it here so en-XA is exercised end-to-end.
vi.unmock("next-intl");

// Avoid the next/link router context — render the anchor as a plain <a>.
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { NextIntlClientProvider } from "next-intl";
import { ProfileComingSoon } from "./ProfileComingSoon";

import enUsProfile from "../../../messages/en-US/auth.profile.json";
import enXaProfile from "../../../messages/en-XA/auth.profile.json";

function withIntl(locale: "en-US" | "en-XA", children: ReactNode) {
  const messages =
    locale === "en-US"
      ? { auth: { profile: enUsProfile } }
      : { auth: { profile: enXaProfile } };
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

describe("ProfileComingSoon (BUG-AUTH-3a)", () => {
  beforeEach(() => {
    cleanup();
  });
  afterEach(() => cleanup());

  describe("en-US (default)", () => {
    it("renders the page title and subtitle from the auth.profile catalog", () => {
      render(withIntl("en-US", <ProfileComingSoon />));

      expect(
        screen.getByRole("heading", { level: 1, name: /^Profile$/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /Manage your account, preferences, and notification settings\./i,
        ),
      ).toBeInTheDocument();
    });

    it("renders the coming-soon Badge, heading, and body inside the Lumia Card", () => {
      render(withIntl("en-US", <ProfileComingSoon />));

      expect(screen.getByText(/^Coming soon$/i)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: /Your profile is on its way/i,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /We're building a single place to manage your name, avatar, password/i,
        ),
      ).toBeInTheDocument();
    });

    it("renders a 'Contact support' link as a mailto target", () => {
      render(withIntl("en-US", <ProfileComingSoon />));

      const supportLink = screen.getByRole("link", {
        name: /contact support/i,
      });
      expect(supportLink).toHaveAttribute("href", "mailto:support@xynes.com");
      // Contact support is internal-by-protocol — no target=_blank required.
      expect(supportLink).not.toHaveAttribute("target");
    });

    it("renders a 'Back to dashboard' link pointing at /dashboard/apps", () => {
      render(withIntl("en-US", <ProfileComingSoon />));

      const backLink = screen.getByRole("link", {
        name: /back to dashboard/i,
      });
      expect(backLink).toHaveAttribute("href", "/dashboard/apps");
    });

    it("does not leak secret-shaped strings into rendered output", () => {
      const { container } = render(withIntl("en-US", <ProfileComingSoon />));

      const text = container.textContent ?? "";
      expect(text).not.toMatch(/xynes_live_/);
      expect(text).not.toMatch(/access[_-]?token/i);
      expect(text).not.toMatch(/api[_-]?key/i);
      expect(text).not.toMatch(/key_hash/i);
    });
  });

  describe("en-XA (pseudo-locale)", () => {
    it("pseudo-localises the page title and subtitle", () => {
      render(withIntl("en-XA", <ProfileComingSoon />));

      expect(
        screen.getByRole("heading", { level: 1, name: /\[PPrrooffiillee\]/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /\[MMaannaaggee yyoouurr aaccccoouunntt, pprreeffeerreenncceess, aanndd nnoottiiffiiccaattiioonn sseettttiinnggss\.\]/,
        ),
      ).toBeInTheDocument();
    });

    it("pseudo-localises the card content and link labels but preserves canonical hrefs", () => {
      render(withIntl("en-XA", <ProfileComingSoon />));

      expect(screen.getByText(/\[CCoommiinngg ssoooonn\]/)).toBeInTheDocument();
      expect(
        screen.getByRole("heading", {
          level: 2,
          name: /\[YYoouurr pprrooffiillee iiss oonn iittss wwaayy\]/,
        }),
      ).toBeInTheDocument();
      const backLink = screen.getByRole("link", {
        name: /\[BBaacckk ttoo ddaasshhbbooaarrdd\]/,
      });
      expect(backLink).toHaveAttribute("href", "/dashboard/apps");
      const supportLink = screen.getByRole("link", {
        name: /\[CCoonnttaacctt ssuuppppoorrtt\]/,
      });
      expect(supportLink).toHaveAttribute("href", "mailto:support@xynes.com");
    });
  });
});
