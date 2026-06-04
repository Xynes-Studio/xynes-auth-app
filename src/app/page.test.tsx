import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the next/navigation `redirect()` so we can assert it without an
// actual server response.
const redirectMock = vi.fn((url: string): never => {
  throw new Error(`__REDIRECT__:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => redirectMock(url),
}));

// Mock the Supabase server-client factory so the test controls the auth
// state. The factory returns an object whose `auth.getUser()` is itself
// configurable per-test.
const getUserMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: {
        getUser: () => getUserMock(),
      },
    }),
}));

// Mock the allowlist getter to a deterministic value so the redirect
// behaviour is host-agnostic.
vi.mock("@/lib/redirect", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/redirect")>("@/lib/redirect");
  return {
    ...actual,
    getAllowedRedirectDomains: () => ["xynes.com", "localhost:3000"],
  };
});

// Mock the Next.js server-runtime headers/cookies helpers used by
// `generateMetadata` so the locale-resolution path runs deterministically.
const cookieGetMock = vi.fn<(name: string) => { value: string } | undefined>(
  () => undefined,
);
const headerGetMock = vi.fn<(name: string) => string | null>(() => null);
vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => cookieGetMock(name),
    }),
  headers: () =>
    Promise.resolve({
      get: (name: string) => headerGetMock(name),
    }),
}));

import Home, { generateMetadata } from "@/app/page";
import enUsLanding from "../../messages/en-US/auth.landing.json";
import enXaLanding from "../../messages/en-XA/auth.landing.json";

async function callPage(searchParams?: Record<string, string | string[]>) {
  const params: Record<string, string | string[]> = searchParams ?? {};
  return Home({ searchParams: Promise.resolve(params) });
}

beforeEach(() => {
  redirectMock.mockClear();
  getUserMock.mockReset();
  cookieGetMock.mockReset();
  headerGetMock.mockReset();
  cookieGetMock.mockReturnValue(undefined);
  headerGetMock.mockReturnValue(null);
});

describe("LP-AUTH `/` page (RSC)", () => {
  describe("when the visitor is anonymous", () => {
    beforeEach(() => {
      getUserMock.mockResolvedValue({ data: { user: null }, error: null });
    });

    it("renders the landing screen without redirecting", async () => {
      const element = await callPage();
      expect(redirectMock).not.toHaveBeenCalled();
      // Should resolve to a JSX element with the LandingScreen component.
      expect(element).toBeDefined();
      // The element type is the LandingScreen function — assert by name.
      expect(
        (
          element as unknown as {
            type: { name?: string; displayName?: string };
          }
        ).type.name ?? "",
      ).toBe("LandingScreen");
    });

    it("forwards the default destination + redirectIsExplicit=false when no redirect is supplied", async () => {
      const element = (await callPage()) as unknown as {
        props: { postAuthRedirect: string; redirectIsExplicit: boolean };
      };
      expect(element.props.postAuthRedirect).toBe("/dashboard/apps");
      expect(element.props.redirectIsExplicit).toBe(false);
    });

    it("forwards an allowlisted ?redirect= AND flags it explicit (Codex P2 #1)", async () => {
      const element = (await callPage({
        redirect: "https://cms.xynes.com/dashboard",
      })) as unknown as {
        props: { postAuthRedirect: string; redirectIsExplicit: boolean };
      };
      expect(element.props.postAuthRedirect).toBe(
        "https://cms.xynes.com/dashboard",
      );
      expect(element.props.redirectIsExplicit).toBe(true);
    });

    it("falls closed to the default destination for a hostile ?redirect= AND clears the explicit flag", async () => {
      const element = (await callPage({
        redirect: "javascript:alert(1)",
      })) as unknown as {
        props: { postAuthRedirect: string; redirectIsExplicit: boolean };
      };
      expect(element.props.postAuthRedirect).toBe("/dashboard/apps");
      // Hostile inputs collapse to the default and MUST NOT be treated as
      // explicit — otherwise the login CTA would carry
      // `?redirect=/dashboard/apps` and trip the redirect-loop guard.
      expect(element.props.redirectIsExplicit).toBe(false);
    });

    it("falls closed to the default destination for an unallowed external host", async () => {
      const element = (await callPage({
        redirect: "https://attacker.example.com/steal",
      })) as unknown as {
        props: { postAuthRedirect: string; redirectIsExplicit: boolean };
      };
      expect(element.props.postAuthRedirect).toBe("/dashboard/apps");
      expect(element.props.redirectIsExplicit).toBe(false);
    });

    it("falls closed for a protocol-relative ?redirect=", async () => {
      const element = (await callPage({
        redirect: "//attacker.com/steal",
      })) as unknown as {
        props: { postAuthRedirect: string; redirectIsExplicit: boolean };
      };
      expect(element.props.postAuthRedirect).toBe("/dashboard/apps");
      expect(element.props.redirectIsExplicit).toBe(false);
    });

    it("ignores an array-valued ?redirect= with all-empty entries", async () => {
      const element = (await callPage({
        redirect: ["", "  "],
      })) as unknown as {
        props: { postAuthRedirect: string; redirectIsExplicit: boolean };
      };
      expect(element.props.postAuthRedirect).toBe("/dashboard/apps");
      expect(element.props.redirectIsExplicit).toBe(false);
    });
  });

  describe("when the visitor is already authenticated", () => {
    beforeEach(() => {
      getUserMock.mockResolvedValue({
        data: { user: { id: "user-1", email: "user@xynes.com" } },
        error: null,
      });
    });

    it("redirects to /dashboard/apps by default", async () => {
      await expect(callPage()).rejects.toThrow("__REDIRECT__:/dashboard/apps");
      expect(redirectMock).toHaveBeenCalledWith("/dashboard/apps");
    });

    it("redirects to an allowlisted ?redirect= target", async () => {
      await expect(
        callPage({ redirect: "https://cms.xynes.com/dashboard" }),
      ).rejects.toThrow("__REDIRECT__:https://cms.xynes.com/dashboard");
    });

    it("redirects to the default destination for a hostile ?redirect=", async () => {
      await expect(
        callPage({ redirect: "javascript:alert(1)" }),
      ).rejects.toThrow("__REDIRECT__:/dashboard/apps");
    });
  });

  describe("generateMetadata (Codex P2 #2)", () => {
    it("returns en-US localized title + description by default", async () => {
      const metadata = await generateMetadata();
      expect(metadata.title).toBe(enUsLanding.meta.title);
      expect(metadata.description).toBe(enUsLanding.meta.description);
    });

    it("uses the en-XA pseudo-locale catalog when the cookie selects it", async () => {
      cookieGetMock.mockImplementation((name: string) =>
        name === "xynes_locale" ? { value: "en-XA" } : undefined,
      );
      const metadata = await generateMetadata();
      expect(metadata.title).toBe(enXaLanding.meta.title);
      expect(metadata.description).toBe(enXaLanding.meta.description);
    });

    it("falls closed to en-US for a hostile / unsupported cookie value", async () => {
      // negotiateLocale is built to fail-closed on path-traversal style
      // cookies (`../../etc/passwd`), `javascript:` URIs, etc.
      cookieGetMock.mockImplementation((name: string) =>
        name === "xynes_locale" ? { value: "../../etc/passwd" } : undefined,
      );
      const metadata = await generateMetadata();
      expect(metadata.title).toBe(enUsLanding.meta.title);
      expect(metadata.description).toBe(enUsLanding.meta.description);
    });

    it("honours `accept-language` when the cookie is absent", async () => {
      headerGetMock.mockImplementation((name: string) =>
        name === "accept-language" ? "en-XA,en;q=0.9" : null,
      );
      const metadata = await generateMetadata();
      expect(metadata.title).toBe(enXaLanding.meta.title);
    });

    it("never leaks raw catalog key paths or secrets into metadata", async () => {
      const metadata = await generateMetadata();
      const serialized = JSON.stringify(metadata);
      // The metadata MUST resolve to actual strings — never a literal
      // catalog key path like `auth.landing.meta.title`.
      expect(serialized).not.toMatch(/auth\.landing\.meta/);
      // Same hostile-pattern sweep used by `src/i18n/config.test.ts`.
      expect(serialized).not.toMatch(/xynes_live_/i);
      expect(serialized).not.toMatch(/AKIA[A-Z0-9]+/);
      expect(serialized).not.toMatch(/key_hash/i);
    });
  });
});
