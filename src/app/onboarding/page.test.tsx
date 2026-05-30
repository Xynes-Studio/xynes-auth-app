import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { onboardingScreenMock } = vi.hoisted(() => ({
  onboardingScreenMock: vi.fn(({ redirectUrl }: { redirectUrl?: string }) => (
    <div
      data-testid="onboarding-screen"
      data-redirect-url={redirectUrl ?? ""}
    />
  )),
}));

vi.mock("@/components/onboarding", () => ({
  OnboardingScreen: onboardingScreenMock,
}));

import OnboardingPage from "./page";

async function renderPage(
  searchParams?: Record<string, string | string[] | undefined>,
) {
  // Next.js 15 RSCs receive searchParams as a Promise. The page is async.
  const ui = await OnboardingPage({
    searchParams: searchParams ? Promise.resolve(searchParams) : undefined,
  });
  render(ui);
}

/**
 * The page is now a thin RSC that delegates visible markup to
 * `<OnboardingScreen>` (client). The only behavior left on the server side is
 * `?redirect=<url>` parsing + forwarding — WSA-FIX-2 (2026-05-12). Visual
 * copy assertions moved to the client component's own i18n test suite
 * (`OnboardingScreen.i18n.test.tsx`) per BUG-AUTH-1 (2026-05-30).
 */
describe("OnboardingPage", () => {
  beforeEach(() => {
    onboardingScreenMock.mockClear();
  });

  it("renders OnboardingScreen when no search params are supplied", async () => {
    await renderPage();
    expect(screen.getByTestId("onboarding-screen")).toBeInTheDocument();
  });

  describe("WSA-FIX-2: ?redirect= forwarding", () => {
    it("forwards a string redirect query param to OnboardingScreen", async () => {
      await renderPage({
        redirect: "https://cms.xynes.com/dashboard",
      });

      const screenNode = screen.getByTestId("onboarding-screen");
      expect(screenNode).toHaveAttribute(
        "data-redirect-url",
        "https://cms.xynes.com/dashboard",
      );
      expect(onboardingScreenMock).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: "https://cms.xynes.com/dashboard",
        }),
        undefined,
      );
    });

    it("renders OnboardingScreen with redirectUrl undefined when no query param is present", async () => {
      await renderPage();

      const screenNode = screen.getByTestId("onboarding-screen");
      // The attribute is rendered as the empty string when undefined.
      expect(screenNode).toHaveAttribute("data-redirect-url", "");
      expect(onboardingScreenMock).toHaveBeenCalledWith(
        expect.objectContaining({ redirectUrl: undefined }),
        undefined,
      );
    });

    it("renders OnboardingScreen with redirectUrl undefined when searchParams is missing entirely", async () => {
      // Simulate a request with no searchParams Promise at all.
      const ui = await OnboardingPage({});
      render(ui);

      expect(onboardingScreenMock).toHaveBeenCalledWith(
        expect.objectContaining({ redirectUrl: undefined }),
        undefined,
      );
    });

    it("trims whitespace around the redirect query param", async () => {
      await renderPage({
        redirect: "   https://cms.xynes.com/dashboard   ",
      });

      expect(onboardingScreenMock).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: "https://cms.xynes.com/dashboard",
        }),
        undefined,
      );
    });

    it("treats an empty redirect string as undefined", async () => {
      await renderPage({ redirect: "" });

      expect(onboardingScreenMock).toHaveBeenCalledWith(
        expect.objectContaining({ redirectUrl: undefined }),
        undefined,
      );
    });

    it("uses the first non-empty value when redirect appears multiple times", async () => {
      await renderPage({
        redirect: [
          "",
          "  ",
          "https://cms.xynes.com/dashboard",
          "https://other",
        ],
      });

      expect(onboardingScreenMock).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: "https://cms.xynes.com/dashboard",
        }),
        undefined,
      );
    });

    it("does NOT validate the redirect URL itself — that is delegated to CreateWorkspaceForm", async () => {
      // The page must forward whatever was passed; CreateWorkspaceForm uses
      // getSafeRedirectUrl + getAllowedRedirectDomains() to reject untrusted hosts.
      await renderPage({ redirect: "https://evil.example/" });

      expect(onboardingScreenMock).toHaveBeenCalledWith(
        expect.objectContaining({ redirectUrl: "https://evil.example/" }),
        undefined,
      );
    });
  });
});
