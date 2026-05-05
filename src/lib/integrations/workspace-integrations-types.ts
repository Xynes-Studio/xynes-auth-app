/**
 * Workspace Admin Integrations — shared types
 *
 * These types describe the safe, user-facing shape of workspace integration
 * resources (verified domains, workspace API keys). They intentionally exclude
 * server-side secrets (`verificationValueHash`, `keyHash`, raw key material
 * after creation, internal audit fields). The client module enforces this
 * contract by allowlisting fields it copies from upstream payloads.
 *
 * Source of truth: `xynes/xynes-infra/infra/architecture/epics/workspace-admin-integrations.md`.
 */

// ── Domains ─────────────────────────────────────────────────────

export type WorkspaceDomainStatus =
  | "pending"
  | "verified"
  | "failed"
  | "disabled";

export type WorkspaceDomain = {
  id: string;
  hostname: string;
  status: WorkspaceDomainStatus;
  verificationMethod: "dns_txt";
  verificationName: string;
  lastCheckedAt?: string | null;
  verifiedAt?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Result of registering a workspace domain.
 *
 * `verificationValue` is the raw DNS TXT value the user must publish. The
 * server only stores its hash, so this string is shown exactly once at
 * creation time and never returned by subsequent list/verify reads.
 */
export type RegisteredWorkspaceDomain = {
  domain: WorkspaceDomain;
  verificationValue: string;
};

// ── API Keys ────────────────────────────────────────────────────

export type WorkspaceApiKeyStatus = "active" | "revoked" | "expired";

/**
 * MVP preset → action-key scope mapping. Mirrors
 * `WORKSPACE_API_KEY_PRESETS` in `xynes-accounts-service`.
 *
 * Keep this list in sync with the backend `validatePresetKey` allowlist; the
 * client validates locally to avoid hitting the network with bad input.
 */
export const WORKSPACE_API_KEY_PRESET_KEYS = [
  "cms_readonly",
  "cms_authoring",
  "cms_publisher",
  "telemetry_read",
  "workspace_admin",
] as const;

export type WorkspaceApiKeyPresetKey =
  (typeof WORKSPACE_API_KEY_PRESET_KEYS)[number];

export type WorkspaceApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  status: WorkspaceApiKeyStatus;
  presetKey?: string | null;
  createdAt: string;
  expiresAt?: string | null;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
};

/**
 * Result of creating a workspace API key.
 *
 * `rawKey` is shown exactly once and MUST never be persisted client-side
 * beyond the one-time reveal UI. The server only stores its Argon2id hash.
 */
export type CreatedWorkspaceApiKey = {
  key: WorkspaceApiKey;
  rawKey: string;
};
