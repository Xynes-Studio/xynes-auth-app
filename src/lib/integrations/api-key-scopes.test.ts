import { afterEach, describe, expect, it, vi } from "vitest";
import { readWorkspaceApiKeyScopes } from "./workspace-integrations-client";

const args = { apiBaseUrl: "http://localhost:4100", workspaceId: "fixture/workspace", keyId: "fixture/key", getAccessToken: async () => "fixture-user-token" };
afterEach(() => vi.restoreAllMocks());
describe("actual persisted key scopes", () => {
  it("reads the authorized usage endpoint, unwraps envelopes and returns only action keys", async () => {
    const signal = new AbortController().signal;
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { ok: true, data: { keyId: args.keyId, scopes: ["cms.entry.publish"], keyHash: "must-not-leak", rawKey: "must-not-leak" } } })));
    expect(await readWorkspaceApiKeyScopes({ ...args, signal })).toEqual(["cms.entry.publish"]);
    expect(fetch).toHaveBeenCalledWith("http://localhost:4100/workspaces/fixture%2Fworkspace/api-keys/fixture%2Fkey/usage", expect.objectContaining({ method: "GET", signal, headers: { Authorization: "Bearer fixture-user-token" } }));
  });
  it.each([
    { keyId: "foreign-key", scopes: ["cms.entry.publish"] },
    { keyId: args.keyId, scopes: "cms.entry.publish" },
    { keyId: args.keyId, scopes: [123] },
    { keyId: args.keyId, scopes: ["<script>"] },
    { keyId: args.keyId, scopes: ["cms.entry.publish", "cms.entry.publish"] },
    { keyId: args.keyId, scopes: Array.from({ length: 201 }, (_, i) => `cms.fixture${i}`) },
  ])("rejects malformed or mismatched usage metadata %#", async (payload) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, data: payload })));
    await expect(readWorkspaceApiKeyScopes(args)).rejects.toThrow("Unexpected response while reading API key scopes");
  });
  it("accepts an empty actual set without inferring privileges from a preset", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, data: { keyId: args.keyId, presetKey: "cms_publisher", scopes: [] } })));
    expect(await readWorkspaceApiKeyScopes(args)).toEqual([]);
  });
  it("preserves authorization failure and rejects absent session or key", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 403 }));
    await expect(readWorkspaceApiKeyScopes(args)).rejects.toMatchObject({ statusCode: 403 });
    fetch.mockClear();
    await expect(readWorkspaceApiKeyScopes({ ...args, getAccessToken: async () => null })).rejects.toMatchObject({ statusCode: 401 });
    await expect(readWorkspaceApiKeyScopes({ ...args, keyId: " " })).rejects.toMatchObject({ statusCode: 400 });
    expect(fetch).not.toHaveBeenCalled();
  });
});
