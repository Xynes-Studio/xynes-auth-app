import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const { createWorkspaceFormMock } = vi.hoisted(() => ({
  createWorkspaceFormMock: vi.fn(
    ({ redirectUrl }: { redirectUrl?: string }) => (
      <div
        data-testid="create-workspace-form"
        data-redirect-url={redirectUrl ?? ""}
      />
    ),
  ),
}));

vi.mock("@/components/onboarding", () => ({
  CreateWorkspaceForm: createWorkspaceFormMock,
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

describe("OnboardingPage", () => {
  beforeEach(() => {
    createWorkspaceFormMock.mockClear();
  });

  it("uses higher-contrast text for intro and footer", async () => {
    await renderPage();

    const intro = screen.getByText(/create your first workspace/i);
    const footer = screen.getByText(/need help\?/i);

    expect(intro).toHaveClass("text-foreground/70");
    expect(footer).toHaveClass("text-foreground/70");
  });

  describe("WSA-FIX-2: ?redirect= forwarding", () => {
    it("forwards a string redirect query param to CreateWorkspaceForm", async () => {
      await renderPage({
        redirect: "https://cms.xynes.com/dashboard",
      });

      const form = screen.getByTestId("create-workspace-form");
      expect(form).toHaveAttribute(
        "data-redirect-url",
        "https://cms.xynes.com/dashboard",
      );
      expect(createWorkspaceFormMock).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: "https://cms.xynes.com/dashboard",
        }),
        undefined,
      );
    });

    it("renders the form with redirectUrl undefined when no query param is present", async () => {
      await renderPage();

      const form = screen.getByTestId("create-workspace-form");
      // The attribute is rendered as the empty string when undefined.
      expect(form).toHaveAttribute("data-redirect-url", "");
      expect(createWorkspaceFormMock).toHaveBeenCalledWith(
        expect.objectContaining({ redirectUrl: undefined }),
        undefined,
      );
    });

    it("renders the form with redirectUrl undefined when searchParams is missing entirely", async () => {
      // Simulate a request with no searchParams Promise at all.
      const ui = await OnboardingPage({});
      render(ui);

      expect(createWorkspaceFormMock).toHaveBeenCalledWith(
        expect.objectContaining({ redirectUrl: undefined }),
        undefined,
      );
    });

    it("trims whitespace around the redirect query param", async () => {
      await renderPage({
        redirect: "   https://cms.xynes.com/dashboard   ",
      });

      expect(createWorkspaceFormMock).toHaveBeenCalledWith(
        expect.objectContaining({
          redirectUrl: "https://cms.xynes.com/dashboard",
        }),
        undefined,
      );
    });

    it("treats an empty redirect string as undefined", async () => {
      await renderPage({ redirect: "" });

      expect(createWorkspaceFormMock).toHaveBeenCalledWith(
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

      expect(createWorkspaceFormMock).toHaveBeenCalledWith(
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

      expect(createWorkspaceFormMock).toHaveBeenCalledWith(
        expect.objectContaining({ redirectUrl: "https://evil.example/" }),
        undefined,
      );
    });
  });
});
