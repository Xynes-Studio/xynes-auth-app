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
});
