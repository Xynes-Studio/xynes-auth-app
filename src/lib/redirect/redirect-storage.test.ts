import { describe, it, expect } from "vitest";
import {
  OAUTH_REDIRECT_STORAGE_KEY,
  persistOAuthRedirect,
  readPersistedOAuthRedirect,
  clearPersistedOAuthRedirect,
  resolveOAuthRedirect,
} from "./storage";

const allowedDomains = ["xynes.com", "localhost:3000"];

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
}

describe("OAuth redirect storage", () => {
  it("persists valid relative redirect URLs", () => {
    const storage = createMemoryStorage();
    const result = persistOAuthRedirect("/invite/abc", allowedDomains, storage);

    expect(result).toBe("/invite/abc");
    expect(storage.getItem(OAUTH_REDIRECT_STORAGE_KEY)).toBe("/invite/abc");
  });

  it("persists valid allowed-domain redirect URLs", () => {
    const storage = createMemoryStorage();
    const result = persistOAuthRedirect(
      "https://cms.xynes.com/dashboard",
      allowedDomains,
      storage,
    );

    expect(result).toBe("https://cms.xynes.com/dashboard");
    expect(storage.getItem(OAUTH_REDIRECT_STORAGE_KEY)).toBe(
      "https://cms.xynes.com/dashboard",
    );
  });

  it("clears storage when redirect is invalid", () => {
    const storage = createMemoryStorage();
    storage.setItem(OAUTH_REDIRECT_STORAGE_KEY, "/previous");

    const result = persistOAuthRedirect(
      "https://evil.com",
      allowedDomains,
      storage,
    );

    expect(result).toBeNull();
    expect(storage.getItem(OAUTH_REDIRECT_STORAGE_KEY)).toBeNull();
  });

  it("reads and clears persisted redirect", () => {
    const storage = createMemoryStorage();
    storage.setItem(OAUTH_REDIRECT_STORAGE_KEY, "/workspaces");

    expect(readPersistedOAuthRedirect(storage)).toBe("/workspaces");

    clearPersistedOAuthRedirect(storage);
    expect(readPersistedOAuthRedirect(storage)).toBeNull();
  });

  it("resolves redirect from query param over stored value", () => {
    const result = resolveOAuthRedirect(
      "/dashboard",
      "https://cms.xynes.com",
      "/workspaces",
      allowedDomains,
    );

    expect(result).toBe("/dashboard");
  });

  it("resolves redirect from stored value when query param missing", () => {
    const result = resolveOAuthRedirect(
      null,
      "https://cms.xynes.com",
      "/workspaces",
      allowedDomains,
    );

    expect(result).toBe("https://cms.xynes.com");
  });

  it("falls back to default when both values are invalid", () => {
    const result = resolveOAuthRedirect(
      "https://evil.com",
      "javascript:alert(1)",
      "/workspaces",
      allowedDomains,
    );

    expect(result).toBe("/workspaces");
  });
});
