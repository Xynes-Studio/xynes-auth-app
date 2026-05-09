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

/**
 * Categorized failure codes surfaced by the verify handler. Mirrors the
 * `DomainFailureCode` union in
 * `xynes-accounts-service/src/actions/handlers/integrations/domains.ts`.
 *
 * The frontend translates these into a 3-step diagnostic strip:
 *   - DNS lookup    → ✗ on NXDOMAIN | TIMEOUT | DNS_ERROR; ✓ otherwise
 *   - TXT records   → "N records" (✗ when 0 → NO_RECORDS; ✓ when ≥1)
 *   - Value match   → ✗ on MISMATCH; ✓ on verified
 */
export type WorkspaceDomainFailureCode =
  | "NXDOMAIN"
  | "TIMEOUT"
  | "DNS_ERROR"
  | "NO_RECORDS"
  | "MISMATCH";

export type WorkspaceDomain = {
  id: string;
  hostname: string;
  status: WorkspaceDomainStatus;
  verificationMethod: "dns_txt";
  verificationName: string;
  lastCheckedAt?: string | null;
  verifiedAt?: string | null;
  /**
   * Categorized failure code from the most recent verify attempt.
   * Narrowed to the closed `WorkspaceDomainFailureCode` union so the
   * compiler enforces the panel's diagnostic-strip contract. The
   * client normalizer coerces any unknown upstream string to `null`,
   * so an unexpected backend token can never reach the strip and
   * silently render a misleading status.
   */
  failureCode?: WorkspaceDomainFailureCode | null;
  failureMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Count of TXT records returned by the resolver in the most recent
   * verify attempt. NULL when no attempt has been made or DNS lookup
   * itself errored before records could be enumerated. NEVER carries
   * raw record values (those could be attacker-supplied content from a
   * hostile DNS zone). Used by the panel's diagnostic strip.
   */
  dnsRecordsFound?: number | null;
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
 * MVP preset key allowlist for workspace API keys.
 *
 * **Cross-package contract (PFU-6):** the canonical source of truth is
 * `@xynes/platform-contracts` (`WORKSPACE_API_KEY_PRESET_KEYS` in
 * `xynes/xynes-platform-contracts/src/integrations/api-key-presets.ts`).
 * The accounts-service preset → action-key scope mapping
 * (`WORKSPACE_API_KEY_PRESETS`) is server-only authz wiring and intentionally
 * not part of the cross-package contract.
 *
 * This local copy exists because the auth-app does not currently import
 * `@xynes/platform-contracts` directly (the package is in a sibling
 * monorepo). Parity with the canonical list is enforced by
 * `workspace-integrations-types.contract.test.ts`.
 *
 * The client validates against this list locally to fail closed on unknown
 * presets *before* the network call.
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
