import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWorkspaceMembers } from "./members-api";

describe("fetchWorkspaceMembers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches workspace members using encoded workspace id and auth token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          data: {
            members: [
              {
                userId: "u1",
                email: "ada@xynes.com",
                displayName: "Ada Lovelace",
                roleKey: "workspace_owner",
              },
            ],
          },
        }),
        { status: 200 },
      ),
    );

    const members = await fetchWorkspaceMembers({
      apiBaseUrl: "http://localhost:4100",
      workspaceId: "workspace/with slash",
      getAccessToken: async () => "test-token",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/workspace%2Fwith%20slash/members",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({
      id: "u1",
      designation: "Owner",
    });
  });

  it("throws when api base url is missing", async () => {
    await expect(
      fetchWorkspaceMembers({
        apiBaseUrl: "",
        workspaceId: "ws-1",
        getAccessToken: async () => "token",
      }),
    ).rejects.toThrow("API base URL is not configured");
  });

  it("rejects an empty workspace before requesting a token", async () => {
    const getAccessToken = vi.fn(async () => "token");

    await expect(
      fetchWorkspaceMembers({
        apiBaseUrl: "http://localhost:4100",
        workspaceId: "   ",
        getAccessToken,
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Workspace is not selected",
    });
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it("rejects a missing access token without calling fetch", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      fetchWorkspaceMembers({
        apiBaseUrl: "http://localhost:4100",
        workspaceId: "ws-1",
        getAccessToken: async () => null,
      }),
    ).rejects.toMatchObject({
      statusCode: 401,
      message: "You are not authenticated",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws status-aware error response when request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }),
    );

    await expect(
      fetchWorkspaceMembers({
        apiBaseUrl: "http://localhost:4100",
        workspaceId: "ws-1",
        getAccessToken: async () => "token",
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("extracts a nested gateway error message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: "Membership is unavailable" } }),
        { status: 503 },
      ),
    );

    await expect(
      fetchWorkspaceMembers({
        apiBaseUrl: "http://localhost:4100",
        workspaceId: "ws-1",
        getAccessToken: async () => "token",
      }),
    ).rejects.toMatchObject({
      statusCode: 503,
      message: "Membership is unavailable",
    });
  });

  it("uses the response status text when the failure body is not JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", {
        status: 502,
        statusText: "Bad Gateway",
      }),
    );

    await expect(
      fetchWorkspaceMembers({
        apiBaseUrl: "http://localhost:4100/",
        workspaceId: "ws-1",
        getAccessToken: async () => "token",
      }),
    ).rejects.toMatchObject({
      statusCode: 502,
      message: "Bad Gateway",
    });
  });

  it("uses a safe generic error when no provider message is available", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "",
      json: async () => 42,
    } as Response);

    await expect(
      fetchWorkspaceMembers({
        apiBaseUrl: "http://localhost:4100",
        workspaceId: "ws-1",
        getAccessToken: async () => "token",
      }),
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Failed to fetch users",
    });
  });

  it("forwards an abort signal and removes one trailing base-url slash", async () => {
    const controller = new AbortController();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { members: [] } }), {
        status: 200,
      }),
    );

    await fetchWorkspaceMembers({
      apiBaseUrl: " http://localhost:4100/ ",
      workspaceId: " ws-1 ",
      getAccessToken: async () => "token",
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/members",
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
