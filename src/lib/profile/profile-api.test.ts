import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchMeBootstrap,
  ProfileApiError,
  updateSelfProfile,
} from "./profile-api";

const mockGetSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  }),
}));

describe("profile-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:4100";
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "token-123" } },
    });
  });

  it("updates self profile with PATCH /me/profile", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            id: "u-1",
            email: "a@b.com",
            displayName: "Alice Doe",
            avatarUrl: null,
          },
        }),
      }),
    );

    const result = await updateSelfProfile(" Alice Doe ");
    expect(result.displayName).toBe("Alice Doe");
    vi.unstubAllGlobals();
  });

  it("reads /me bootstrap payload from gateway envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            user: {
              id: "u-1",
              email: "a@b.com",
              displayName: null,
              avatarUrl: null,
            },
            workspaces: [{ slug: "main" }],
          },
        }),
      }),
    );

    const result = await fetchMeBootstrap();
    expect(result.user?.displayName).toBeNull();
    expect(result.workspaces).toHaveLength(1);
    vi.unstubAllGlobals();
  });

  it("throws validation error when displayName is empty", async () => {
    await expect(updateSelfProfile("   ")).rejects.toMatchObject({
      name: "ProfileApiError",
      statusCode: 400,
    });
  });

  it("throws unauthorized when no active session token", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });
    await expect(updateSelfProfile("Alice")).rejects.toMatchObject({
      name: "ProfileApiError",
      statusCode: 401,
    });
  });

  it("throws configured API URL error when NEXT_PUBLIC_API_URL is missing", async () => {
    process.env.NEXT_PUBLIC_API_URL = "";

    await expect(fetchMeBootstrap()).rejects.toMatchObject({
      name: "ProfileApiError",
      statusCode: 500,
    });
  });

  it("extracts nested API error message for profile update failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({
          error: { message: "Display name already in use" },
        }),
      }),
    );

    const error = await updateSelfProfile("Alice").catch((err) => err);
    expect(error).toBeInstanceOf(ProfileApiError);
    expect((error as Error).message).toBe("Display name already in use");
    vi.unstubAllGlobals();
  });

  it("throws fallback request error when response body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Server Error",
        json: async () => {
          throw new Error("not json");
        },
      }),
    );

    await expect(updateSelfProfile("Alice")).rejects.toMatchObject({
      statusCode: 500,
      message: "Request failed",
    });
    vi.unstubAllGlobals();
  });

  it("throws when update profile response does not contain a valid user", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: { displayName: "Alice" },
        }),
      }),
    );

    await expect(updateSelfProfile("Alice")).rejects.toMatchObject({
      statusCode: 500,
      message: "Unexpected profile response",
    });
    vi.unstubAllGlobals();
  });

  it("unwraps nested gateway envelopes when reading /me", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            data: {
              user: {
                id: "u-1",
                email: "a@b.com",
                displayName: "Alice",
                avatarUrl: null,
              },
              workspaces: [],
            },
          },
        }),
      }),
    );

    const result = await fetchMeBootstrap();
    expect(result.user?.id).toBe("u-1");
    expect(result.user?.displayName).toBe("Alice");
    vi.unstubAllGlobals();
  });
});
