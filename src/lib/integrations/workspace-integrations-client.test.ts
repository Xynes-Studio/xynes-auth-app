import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  WorkspaceIntegrationsApiError,
  createWorkspaceApiKey,
  deleteWorkspaceDomain,
  listWorkspaceApiKeys,
  listWorkspaceDomains,
  registerWorkspaceDomain,
  revokeWorkspaceApiKey,
  verifyWorkspaceDomain,
  regenerateWorkspaceDomainVerification,
} from "./workspace-integrations-client";
import type {
  CreatedWorkspaceApiKey,
  WorkspaceApiKey,
  WorkspaceDomain,
} from "./workspace-integrations-types";

const ORIGINAL_API_URL = process.env.NEXT_PUBLIC_API_URL;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function emptyResponse(status: number): Response {
  return new Response(null, { status });
}

const baseClientArgs = {
  apiBaseUrl: "http://localhost:4100",
  workspaceId: "ws-1",
  getAccessToken: async () => "test-token",
};

describe("listWorkspaceDomains", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls GET /workspaces/:workspaceId/domains with bearer auth", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          domains: [
            {
              id: "d1",
              workspaceId: "ws-1",
              hostname: "example.com",
              status: "verified",
              verificationMethod: "dns_txt",
              verificationName: "_xynes.example.com",
              verifiedAt: "2026-04-24T00:00:00.000Z",
              lastCheckedAt: "2026-04-24T00:00:00.000Z",
              failureCode: null,
              failureMessage: null,
            },
          ],
        },
      }),
    );

    const domains = await listWorkspaceDomains(baseClientArgs);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/domains",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
    expect(domains).toHaveLength(1);
    const domain = domains[0] as WorkspaceDomain;
    expect(domain.hostname).toBe("example.com");
    expect(domain.status).toBe("verified");
  });

  it("URL-encodes the workspace id", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ ok: true, data: { domains: [] } }));

    await listWorkspaceDomains({
      ...baseClientArgs,
      workspaceId: "ws/with slash",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws%2Fwith%20slash/domains",
      expect.anything(),
    );
  });

  it("supports unwrapped envelope payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        domains: [
          {
            id: "d1",
            workspaceId: "ws-1",
            hostname: "example.com",
            status: "pending",
            verificationMethod: "dns_txt",
            verificationName: "_xynes.example.com",
          },
        ],
      }),
    );

    const domains = await listWorkspaceDomains(baseClientArgs);
    expect(domains[0]).toMatchObject({
      hostname: "example.com",
      status: "pending",
    });
  });

  it("returns an empty list when the payload is malformed", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ ok: true, data: { domains: "not-an-array" } }),
    );

    const domains = await listWorkspaceDomains(baseClientArgs);
    expect(domains).toEqual([]);
  });

  it("throws status-aware error for failed responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "Forbidden" }, 403),
    );

    await expect(listWorkspaceDomains(baseClientArgs)).rejects.toMatchObject({
      statusCode: 403,
      message: "Forbidden",
    });
  });

  it("throws when the API base URL is missing", async () => {
    await expect(
      listWorkspaceDomains({ ...baseClientArgs, apiBaseUrl: "  " }),
    ).rejects.toMatchObject({ message: "API base URL is not configured" });
  });

  it("throws when the workspace id is missing", async () => {
    await expect(
      listWorkspaceDomains({ ...baseClientArgs, workspaceId: "" }),
    ).rejects.toMatchObject({
      statusCode: 400,
      message: "Workspace is not selected",
    });
  });

  it("throws when no access token is available", async () => {
    await expect(
      listWorkspaceDomains({
        ...baseClientArgs,
        getAccessToken: async () => null,
      }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it("never exposes verification value hashes from the upstream payload", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          domains: [
            {
              id: "d1",
              workspaceId: "ws-1",
              hostname: "example.com",
              status: "pending",
              verificationMethod: "dns_txt",
              verificationName: "_xynes.example.com",
              // hostile fields the gateway should never serialize, but we belt-and-suspenders here
              verificationValueHash: "deadbeef",
              keyHash: "deadbeef",
              internalAuditNote: "should not leak",
            },
          ],
        },
      }),
    );

    const [domain] = await listWorkspaceDomains(baseClientArgs);
    const keys = Object.keys(domain ?? {});
    expect(keys).not.toContain("verificationValueHash");
    expect(keys).not.toContain("keyHash");
    expect(keys).not.toContain("internalAuditNote");
  });
});

describe("registerWorkspaceDomain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts hostname to /workspaces/:workspaceId/domains and returns the raw verification value", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "d1",
          workspaceId: "ws-1",
          hostname: "example.com",
          status: "pending",
          verificationMethod: "dns_txt",
          verificationName: "_xynes.example.com",
          verificationValue: "xynes-verify-abc123",
        },
      }),
    );

    const result = await registerWorkspaceDomain({
      ...baseClientArgs,
      hostname: "example.com",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/domains",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ hostname: "example.com" }),
      }),
    );
    expect(result).toMatchObject({
      domain: { hostname: "example.com", status: "pending" },
      verificationValue: "xynes-verify-abc123",
    });
  });

  it("trims hostname before sending", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "d1",
          workspaceId: "ws-1",
          hostname: "example.com",
          status: "pending",
          verificationMethod: "dns_txt",
          verificationName: "_xynes.example.com",
          verificationValue: "xynes-verify-abc123",
        },
      }),
    );

    await registerWorkspaceDomain({
      ...baseClientArgs,
      hostname: "  example.com  ",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({ hostname: "example.com" }),
      }),
    );
  });

  it("rejects empty hostnames before calling the network", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");

    await expect(
      registerWorkspaceDomain({ ...baseClientArgs, hostname: "   " }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("propagates upstream conflict errors with safe messages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        { error: { message: "Hostname is already registered" } },
        409,
      ),
    );

    await expect(
      registerWorkspaceDomain({ ...baseClientArgs, hostname: "example.com" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "Hostname is already registered",
    });
  });
});

describe("verifyWorkspaceDomain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to /workspaces/:workspaceId/domains/:domainId/verify", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "d1",
          workspaceId: "ws-1",
          hostname: "example.com",
          status: "verified",
          verificationMethod: "dns_txt",
          verificationName: "_xynes.example.com",
          verifiedAt: "2026-04-24T00:00:00.000Z",
        },
      }),
    );

    const domain = await verifyWorkspaceDomain({
      ...baseClientArgs,
      domainId: "d1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/domains/d1/verify",
      expect.objectContaining({ method: "POST" }),
    );
    expect(domain.status).toBe("verified");
  });

  it("URL-encodes domain id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "d/1",
          workspaceId: "ws-1",
          hostname: "example.com",
          status: "failed",
          verificationMethod: "dns_txt",
          verificationName: "_xynes.example.com",
        },
      }),
    );

    await verifyWorkspaceDomain({ ...baseClientArgs, domainId: "d/1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/domains/d%2F1/verify",
      expect.anything(),
    );
  });

  it("rejects empty domain ids", async () => {
    await expect(
      verifyWorkspaceDomain({ ...baseClientArgs, domainId: "" }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("regenerateWorkspaceDomainVerification", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("posts to /workspaces/:workspaceId/domains/:domainId/regenerate-verification", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          ok: true,
          data: {
            id: "d1",
            workspaceId: "ws-1",
            hostname: "example.com",
            status: "pending",
            verificationMethod: "dns_txt",
            verificationName: "_xynes.example.com",
            verificationValue: "xynes-verify-newvalue",
          },
        },
        201,
      ),
    );

    const result = await regenerateWorkspaceDomainVerification({
      ...baseClientArgs,
      domainId: "d1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/domains/d1/regenerate-verification",
      expect.objectContaining({ method: "POST", body: "{}" }),
    );
    expect(result.domain.status).toBe("pending");
    expect(result.verificationValue).toBe("xynes-verify-newvalue");
  });

  it("URL-encodes the domain id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          ok: true,
          data: {
            id: "d/1",
            workspaceId: "ws-1",
            hostname: "example.com",
            status: "pending",
            verificationMethod: "dns_txt",
            verificationName: "_xynes.example.com",
            verificationValue: "xynes-verify-newvalue",
          },
        },
        201,
      ),
    );

    await regenerateWorkspaceDomainVerification({
      ...baseClientArgs,
      domainId: "d/1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/domains/d%2F1/regenerate-verification",
      expect.anything(),
    );
  });

  it("forwards the bearer token to the gateway", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "d1",
          workspaceId: "ws-1",
          hostname: "example.com",
          status: "pending",
          verificationMethod: "dns_txt",
          verificationName: "_xynes.example.com",
          verificationValue: "xynes-verify-newvalue",
        },
      }),
    );

    await regenerateWorkspaceDomainVerification({
      ...baseClientArgs,
      domainId: "d1",
    });

    const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)
      ?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(headers["Content-Type"]).toBe("application/json");
  });

  it("rejects empty domain ids before hitting the network", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(
      regenerateWorkspaceDomainVerification({
        ...baseClientArgs,
        domainId: "",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails closed if the server omits the new verificationValue", async () => {
    // Security invariant: if the upstream forgets to include the fresh
    // raw value, the user has no way to update their DNS record. Better
    // to surface this as an error than silently leave them with a
    // mismatched hash they can't satisfy.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          ok: true,
          data: {
            id: "d1",
            workspaceId: "ws-1",
            hostname: "example.com",
            status: "pending",
            verificationMethod: "dns_txt",
            verificationName: "_xynes.example.com",
            // verificationValue intentionally missing
          },
        },
        201,
      ),
    );

    await expect(
      regenerateWorkspaceDomainVerification({
        ...baseClientArgs,
        domainId: "d1",
      }),
    ).rejects.toMatchObject({
      statusCode: 500,
      message: /verification value missing/i,
    });
  });

  it("surfaces a 409 CONFLICT for verified/disabled rows", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          ok: false,
          error: {
            code: "CONFLICT",
            message: "Cannot regenerate verification for a verified domain",
          },
        },
        409,
      ),
    );

    await expect(
      regenerateWorkspaceDomainVerification({
        ...baseClientArgs,
        domainId: "d1",
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("never echoes verificationValueHash from the server payload", async () => {
    // Defense in depth: even if a future bug made the server return the
    // hash field, the client allowlist must NOT carry it forward. The
    // resulting `domain` is built field-by-field from a small set of
    // known-safe properties.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "d1",
          workspaceId: "ws-1",
          hostname: "example.com",
          status: "pending",
          verificationMethod: "dns_txt",
          verificationName: "_xynes.example.com",
          verificationValue: "xynes-verify-newvalue",
          verificationValueHash: "DO_NOT_LEAK_THIS_HASH",
        },
      }),
    );

    const result = await regenerateWorkspaceDomainVerification({
      ...baseClientArgs,
      domainId: "d1",
    });

    const serialised = JSON.stringify(result);
    expect(serialised).not.toContain("DO_NOT_LEAK_THIS_HASH");
    expect(serialised).not.toContain("verificationValueHash");
  });
});

describe("deleteWorkspaceDomain", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls DELETE /workspaces/:workspaceId/domains/:domainId", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(emptyResponse(204));

    await deleteWorkspaceDomain({ ...baseClientArgs, domainId: "d1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/domains/d1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws when the upstream returns an error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ message: "Not found" }, 404),
    );

    await expect(
      deleteWorkspaceDomain({ ...baseClientArgs, domainId: "d1" }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe("listWorkspaceApiKeys", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls GET /workspaces/:workspaceId/api-keys", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          apiKeys: [
            {
              id: "k1",
              workspaceId: "ws-1",
              name: "CMS readonly",
              keyPrefix: "abcdef12",
              status: "active",
              presetKey: "cms_readonly",
              createdAt: "2026-04-24T00:00:00.000Z",
              expiresAt: null,
              lastUsedAt: "2026-04-25T00:00:00.000Z",
            },
          ],
        },
      }),
    );

    const keys = await listWorkspaceApiKeys(baseClientArgs);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/api-keys",
      expect.objectContaining({ method: "GET" }),
    );
    expect(keys).toHaveLength(1);
    const key = keys[0] as WorkspaceApiKey;
    expect(key).toMatchObject({
      id: "k1",
      keyPrefix: "abcdef12",
      status: "active",
      presetKey: "cms_readonly",
    });
  });

  it("returns an empty list for malformed payloads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ ok: true, data: { apiKeys: null } }),
    );
    const keys = await listWorkspaceApiKeys(baseClientArgs);
    expect(keys).toEqual([]);
  });

  it("never surfaces keyHash or rawKey from listed keys", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          apiKeys: [
            {
              id: "k1",
              workspaceId: "ws-1",
              name: "leaky",
              keyPrefix: "abcdef12",
              status: "active",
              presetKey: "cms_readonly",
              createdAt: "2026-04-24T00:00:00.000Z",
              keyHash: "deadbeef",
              rawKey: "xynes_live_should_not_leak",
              internalAuditNote: "secret",
            },
          ],
        },
      }),
    );
    const [key] = await listWorkspaceApiKeys(baseClientArgs);
    const keys = Object.keys(key ?? {});
    expect(keys).not.toContain("keyHash");
    expect(keys).not.toContain("rawKey");
    expect(keys).not.toContain("internalAuditNote");
  });
});

describe("createWorkspaceApiKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs name + presetKey and returns the raw key only on the create result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "k1",
          workspaceId: "ws-1",
          name: "CMS readonly",
          keyPrefix: "abcdef12",
          status: "active",
          presetKey: "cms_readonly",
          createdAt: "2026-04-24T00:00:00.000Z",
          rawKey: "xynes_live_abcdef12...",
          scopes: ["cms.content.listPublished"],
        },
      }),
    );

    const result: CreatedWorkspaceApiKey = await createWorkspaceApiKey({
      ...baseClientArgs,
      name: "CMS readonly",
      presetKey: "cms_readonly",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/api-keys",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          name: "CMS readonly",
          presetKey: "cms_readonly",
        }),
      }),
    );

    expect(result.rawKey).toBe("xynes_live_abcdef12...");
    expect(result.key).toMatchObject({
      id: "k1",
      keyPrefix: "abcdef12",
      status: "active",
    });
    // The metadata key DTO must not contain rawKey
    expect(Object.keys(result.key)).not.toContain("rawKey");
  });

  it("forwards optional expiresAt when provided", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "k1",
          workspaceId: "ws-1",
          name: "CMS readonly",
          keyPrefix: "abcdef12",
          status: "active",
          presetKey: "cms_readonly",
          createdAt: "2026-04-24T00:00:00.000Z",
          expiresAt: "2026-12-31T00:00:00.000Z",
          rawKey: "xynes_live_abcdef12...",
        },
      }),
    );

    await createWorkspaceApiKey({
      ...baseClientArgs,
      name: "CMS readonly",
      presetKey: "cms_readonly",
      expiresAt: "2026-12-31T00:00:00.000Z",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: JSON.stringify({
          name: "CMS readonly",
          presetKey: "cms_readonly",
          expiresAt: "2026-12-31T00:00:00.000Z",
        }),
      }),
    );
  });

  it("rejects empty name without calling the network", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(
      createWorkspaceApiKey({
        ...baseClientArgs,
        name: "  ",
        presetKey: "cms_readonly",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unknown preset keys without calling the network", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(
      createWorkspaceApiKey({
        ...baseClientArgs,
        name: "Bad",
        // @ts-expect-error – intentionally invalid
        presetKey: "totally_made_up",
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws a safe error when raw key is missing from the response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "k1",
          workspaceId: "ws-1",
          name: "CMS readonly",
          keyPrefix: "abcdef12",
          status: "active",
          presetKey: "cms_readonly",
          createdAt: "2026-04-24T00:00:00.000Z",
        },
      }),
    );

    await expect(
      createWorkspaceApiKey({
        ...baseClientArgs,
        name: "CMS readonly",
        presetKey: "cms_readonly",
      }),
    ).rejects.toBeInstanceOf(WorkspaceIntegrationsApiError);
  });
});

describe("revokeWorkspaceApiKey", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls POST /workspaces/:workspaceId/api-keys/:keyId/revoke", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "k1",
          workspaceId: "ws-1",
          name: "CMS readonly",
          keyPrefix: "abcdef12",
          status: "revoked",
          presetKey: "cms_readonly",
          createdAt: "2026-04-24T00:00:00.000Z",
          revokedAt: "2026-04-25T00:00:00.000Z",
        },
      }),
    );

    const key = await revokeWorkspaceApiKey({
      ...baseClientArgs,
      keyId: "k1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/api-keys/k1/revoke",
      expect.objectContaining({ method: "POST" }),
    );
    expect(key.status).toBe("revoked");
  });

  it("URL-encodes the key id", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        ok: true,
        data: {
          id: "k/1",
          workspaceId: "ws-1",
          name: "CMS readonly",
          keyPrefix: "abcdef12",
          status: "revoked",
          presetKey: "cms_readonly",
          createdAt: "2026-04-24T00:00:00.000Z",
        },
      }),
    );

    await revokeWorkspaceApiKey({ ...baseClientArgs, keyId: "k/1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4100/workspaces/ws-1/api-keys/k%2F1/revoke",
      expect.anything(),
    );
  });

  it("propagates ALREADY_REVOKED conflict errors with the safe upstream message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "ALREADY_REVOKED",
            message: "API key has already been revoked",
          },
        },
        409,
      ),
    );

    await expect(
      revokeWorkspaceApiKey({ ...baseClientArgs, keyId: "k1" }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: "API key has already been revoked",
    });
  });

  it("returns a safe fallback message when upstream omits one", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("server crashed", {
        status: 500,
        statusText: "Internal Server Error",
      }),
    );

    await expect(
      revokeWorkspaceApiKey({ ...baseClientArgs, keyId: "k1" }),
    ).rejects.toMatchObject({
      statusCode: 500,
      message: "Internal Server Error",
    });
  });
});

describe("WorkspaceIntegrationsApiError", () => {
  it("carries statusCode and message and is named", () => {
    const err = new WorkspaceIntegrationsApiError(418, "I am a teapot");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("WorkspaceIntegrationsApiError");
    expect(err.statusCode).toBe(418);
    expect(err.message).toBe("I am a teapot");
  });
});

// Ensure module-level env mutation in tests does not affect global setup.
beforeEach(() => {
  process.env.NEXT_PUBLIC_API_URL = ORIGINAL_API_URL ?? "https://api.test.com";
});
