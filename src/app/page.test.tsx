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

import Home from "@/app/page";

async function callPage(searchParams?: Record<string, string | string[]>) {
  const params: Record<string, string | string[]> = searchParams ?? {};
  return Home({ searchParams: Promise.resolve(params) });
}

beforeEach(() => {
  redirectMock.mockClear();
  getUserMock.mockReset();
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

    it("forwards the default destination to LandingScreen when no redirect is supplied", async () => {
      const element = (await callPage()) as unknown as {
        props: { signupRedirect: string };
      };
      expect(element.props.signupRedirect).toBe("/dashboard/apps");
    });

    it("forwards an allowlisted ?redirect= to LandingScreen", async () => {
      const element = (await callPage({
        redirect: "https://cms.xynes.com/dashboard",
      })) as unknown as { props: { signupRedirect: string } };
      expect(element.props.signupRedirect).toBe(
        "https://cms.xynes.com/dashboard",
      );
    });

    it("falls closed to the default destination for a hostile ?redirect=", async () => {
      const element = (await callPage({
        redirect: "javascript:alert(1)",
      })) as unknown as { props: { signupRedirect: string } };
      expect(element.props.signupRedirect).toBe("/dashboard/apps");
    });

    it("falls closed to the default destination for an unallowed external host", async () => {
      const element = (await callPage({
        redirect: "https://attacker.example.com/steal",
      })) as unknown as { props: { signupRedirect: string } };
      expect(element.props.signupRedirect).toBe("/dashboard/apps");
    });

    it("falls closed for a protocol-relative ?redirect=", async () => {
      const element = (await callPage({
        redirect: "//attacker.com/steal",
      })) as unknown as { props: { signupRedirect: string } };
      expect(element.props.signupRedirect).toBe("/dashboard/apps");
    });

    it("ignores an array-valued ?redirect= with all-empty entries", async () => {
      const element = (await callPage({
        redirect: ["", "  "],
      })) as unknown as { props: { signupRedirect: string } };
      expect(element.props.signupRedirect).toBe("/dashboard/apps");
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
});
