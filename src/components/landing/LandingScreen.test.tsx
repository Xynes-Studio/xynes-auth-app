import { describe, expect, it, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";

import { LandingScreen } from "@/components/landing/LandingScreen";
import enUsLanding from "../../../messages/en-US/auth.landing.json";

afterEach(() => cleanup());

describe("LP-AUTH <LandingScreen>", () => {
  const renderScreen = (props?: {
    postAuthRedirect?: string;
    redirectIsExplicit?: boolean;
  }) =>
    render(
      <LandingScreen
        postAuthRedirect={props?.postAuthRedirect ?? "/dashboard/apps"}
        redirectIsExplicit={props?.redirectIsExplicit ?? false}
      />,
    );

  it("renders the hero headline as the single <h1>", () => {
    renderScreen();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent(enUsLanding.hero.headline);
    // There must be exactly one <h1> on the page (a11y invariant).
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("renders the three feature cards from the structural list", () => {
    renderScreen();
    // Feature cards render their headline via <h3>.
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: enUsLanding.features.workspaceScoped.headline,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: enUsLanding.features.sso.headline,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 3,
        name: enUsLanding.features.openSource.headline,
      }),
    ).toBeInTheDocument();
  });

  it("renders the primary and secondary CTAs as anchors, not buttons", () => {
    renderScreen();
    // Primary CTA → bare /login (no `?redirect=` query when the visitor did
    // not supply an explicit redirect — appending the default destination
    // would trip the login redirect-loop guard).
    const heroSection = screen
      .getByRole("heading", { level: 1 })
      .closest("section");
    expect(heroSection).not.toBeNull();
    const inHero = within(heroSection as HTMLElement);
    const primaryCta = inHero.getByRole("link", {
      name: new RegExp(enUsLanding.hero.primaryCta, "i"),
    });
    expect(primaryCta).toHaveAttribute("href", "/login");
    // Secondary CTA → bare /signup for the same reason.
    const secondaryCta = inHero.getByRole("link", {
      name: new RegExp(enUsLanding.hero.secondaryCta, "i"),
    });
    expect(secondaryCta).toHaveAttribute("href", "/signup");
  });

  it("preserves an explicit redirect on BOTH sign-in AND sign-up CTAs (Codex P2 #1)", () => {
    renderScreen({
      postAuthRedirect: "https://cms.xynes.com/dashboard",
      redirectIsExplicit: true,
    });
    const heroSection = screen
      .getByRole("heading", { level: 1 })
      .closest("section");
    const inHero = within(heroSection as HTMLElement);
    const encoded = encodeURIComponent("https://cms.xynes.com/dashboard");
    // Sign-in CTA (primary) must now carry the validated deep link.
    expect(
      inHero.getByRole("link", {
        name: new RegExp(enUsLanding.hero.primaryCta, "i"),
      }),
    ).toHaveAttribute("href", `/login?redirect=${encoded}`);
    // Sign-up CTA (secondary) preserves it too.
    expect(
      inHero.getByRole("link", {
        name: new RegExp(enUsLanding.hero.secondaryCta, "i"),
      }),
    ).toHaveAttribute("href", `/signup?redirect=${encoded}`);
  });

  it("preserves the same explicit redirect on the nav CTAs", () => {
    renderScreen({
      postAuthRedirect: "https://cms.xynes.com/dashboard",
      redirectIsExplicit: true,
    });
    const nav = screen.getByRole("navigation", { name: /primary/i });
    const inNav = within(nav);
    const encoded = encodeURIComponent("https://cms.xynes.com/dashboard");
    expect(
      inNav.getByRole("link", {
        name: new RegExp(enUsLanding.nav.signIn, "i"),
      }),
    ).toHaveAttribute("href", `/login?redirect=${encoded}`);
    expect(
      inNav.getByRole("link", {
        name: new RegExp(enUsLanding.nav.signUp, "i"),
      }),
    ).toHaveAttribute("href", `/signup?redirect=${encoded}`);
  });

  it("encodes the postAuthRedirect query parameter safely", () => {
    renderScreen({
      postAuthRedirect: "https://cms.xynes.com/dashboard?x=1",
      redirectIsExplicit: true,
    });
    const heroSection = screen
      .getByRole("heading", { level: 1 })
      .closest("section");
    const inHero = within(heroSection as HTMLElement);
    const secondaryCta = inHero.getByRole("link", {
      name: new RegExp(enUsLanding.hero.secondaryCta, "i"),
    });
    // The redirect must round-trip through encodeURIComponent.
    expect(secondaryCta).toHaveAttribute(
      "href",
      `/signup?redirect=${encodeURIComponent(
        "https://cms.xynes.com/dashboard?x=1",
      )}`,
    );
  });

  it("renders the OSS source-code chip with a safe https GitHub URL", () => {
    renderScreen();
    const sourceCodeLink = screen.getByRole("link", { name: /source code/i });
    expect(sourceCodeLink).toHaveAttribute(
      "href",
      "https://github.com/Xynes-Studio/xynes-auth-app",
    );
    expect(sourceCodeLink).toHaveAttribute("target", "_blank");
    expect(sourceCodeLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders the security policy link pointing at /SECURITY.md", () => {
    renderScreen();
    const securityLink = screen.getByRole("link", { name: /security policy/i });
    expect(securityLink).toHaveAttribute("href", "/SECURITY.md");
  });

  it("renders the footer landmark with the documented columns", () => {
    renderScreen();
    const footer = screen.getByRole("contentinfo");
    const inFooter = within(footer);
    // Every column heading must be reachable as <h3>.
    for (const col of [
      enUsLanding.footer.columns.product.heading,
      enUsLanding.footer.columns.developers.heading,
      enUsLanding.footer.columns.company.heading,
      enUsLanding.footer.columns.legal.heading,
    ]) {
      expect(
        inFooter.getByRole("heading", { level: 3, name: col }),
      ).toBeInTheDocument();
    }
    // Copyright string is present.
    expect(
      inFooter.getByText(enUsLanding.footer.copyright),
    ).toBeInTheDocument();
  });

  it("marks every external footer link with target=_blank and the safe rel attr", () => {
    renderScreen();
    const footer = screen.getByRole("contentinfo");
    const externalLinks = within(footer)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("target") === "_blank");
    expect(externalLinks.length).toBeGreaterThan(0);
    for (const a of externalLinks) {
      expect(a).toHaveAttribute("rel", "noopener noreferrer");
    }
  });

  it("never renders a <form> element on the landing page", () => {
    const { container } = renderScreen();
    expect(container.querySelector("form")).toBeNull();
  });

  it("renders the cookie disclosure with the documented policy URL", () => {
    renderScreen();
    // CookieDisclosure mounts on the client after hydration via useEffect.
    // happy-dom flushes synchronous effects synchronously, so the policy
    // link is reachable after the initial render.
    const policyLink = screen.getByRole("link", {
      name: new RegExp(enUsLanding.cookie.policyLabel, "i"),
    });
    expect(policyLink).toHaveAttribute(
      "href",
      "https://xynes.com/legal/cookies",
    );
  });
});
