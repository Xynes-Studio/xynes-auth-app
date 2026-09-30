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

  it("throws configured API URL error before updating a profile", async () => {
    process.env.NEXT_PUBLIC_API_URL = "";

    await expect(updateSelfProfile("Alice")).rejects.toMatchObject({
      name: "ProfileApiError",
      statusCode: 500,
      message: "API base URL is not configured",
    });
  });

  it("rejects a missing session token when reading the bootstrap payload", async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null } });

    await expect(fetchMeBootstrap()).rejects.toMatchObject({
      statusCode: 401,
      message: "You are not authenticated",
    });
  });

  it("extracts a direct API error message for bootstrap failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: async () => ({ message: "Workspace access denied" }),
      }),
    );

    await expect(fetchMeBootstrap()).rejects.toMatchObject({
      statusCode: 403,
      message: "Workspace access denied",
    });
    vi.unstubAllGlobals();
  });

  it("uses a generic bootstrap error when payload and status text are empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "",
        json: async () => null,
      }),
    );

    await expect(fetchMeBootstrap()).rejects.toMatchObject({
      statusCode: 500,
      message: "Request failed",
    });
    vi.unstubAllGlobals();
  });

  it("normalizes invalid bootstrap user and workspace shapes safely", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            user: { id: "u-1" },
            workspaces: "not-an-array",
          },
        }),
      }),
    );

    await expect(fetchMeBootstrap()).resolves.toEqual({
      user: null,
      workspaces: [],
    });
    vi.unstubAllGlobals();
  });

  it("returns no user when the successful bootstrap payload is null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true, data: null }),
      }),
    );

    await expect(fetchMeBootstrap()).resolves.toEqual({
      user: null,
      workspaces: [],
    });
    vi.unstubAllGlobals();
  });

  it("preserves optional string profile fields from a direct user payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "u-1",
          email: "a@b.com",
          displayName: "Alice",
          avatarUrl: "https://cdn.example/avatar.png",
          workspaces: [],
        }),
      }),
    );

    await expect(fetchMeBootstrap()).resolves.toMatchObject({
      user: {
        id: "u-1",
        email: "a@b.com",
        displayName: "Alice",
        avatarUrl: "https://cdn.example/avatar.png",
      },
    });
    vi.unstubAllGlobals();
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

  it("uses response statusText when response body is not JSON", async () => {
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
      message: "Server Error",
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
