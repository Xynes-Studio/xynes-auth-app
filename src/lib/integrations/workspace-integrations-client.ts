/**
 * Workspace Admin Integrations — gateway client
 *
 * Client-side wrapper for the workspace-scoped domain + API key gateway routes
 * (`/workspaces/:workspaceId/domains[...]`, `/workspaces/:workspaceId/api-keys[...]`).
 *
 * Security contract (do not relax without a security review):
 * - Bearer auth via the existing Supabase access token; no API keys in the browser.
 * - Path params are URL-encoded.
 * - Response payloads are normalized through allowlists so server-side
 *   secrets (`verificationValueHash`, `keyHash`, `rawKey` outside the
 *   create flow, `internalAuditNote`, …) cannot leak into UI state even if
 *   the upstream accidentally serializes them.
 * - `rawKey` is returned only from `createWorkspaceApiKey`; if the upstream
 *   omits it we fail closed with an error rather than returning a key the
 *   caller cannot use.
 * - Error envelopes are flattened to safe user-facing messages; we never
 *   surface raw stack traces or internal error codes.
 *
 * See: `xynes/xynes-infra/infra/architecture/epics/workspace-admin-integrations.md`.
 */

import { asRecord, unwrapGatewayEnvelope } from "@/lib/http/envelope";
import {
  WORKSPACE_API_KEY_PRESET_KEYS,
  type CreatedWorkspaceApiKey,
  type RegisteredWorkspaceDomain,
  type WorkspaceApiKey,
  type WorkspaceApiKeyPresetKey,
  type WorkspaceApiKeyStatus,
  type WorkspaceDomain,
  type WorkspaceDomainStatus,
} from "./workspace-integrations-types";

export class WorkspaceIntegrationsApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "WorkspaceIntegrationsApiError";
    this.statusCode = statusCode;
  }
}

// ── Shared param shapes ─────────────────────────────────────────

interface BaseClientArgs {
  apiBaseUrl: string;
  workspaceId: string;
  getAccessToken: () => Promise<string | null>;
  signal?: AbortSignal;
}

// ── Helpers ─────────────────────────────────────────────────────

function normalizeBaseUrl(apiBaseUrl: string): string {
  return apiBaseUrl.trim().replace(/\/$/, "");
}

function extractErrorMessage(payload: unknown, statusText?: string): string {
  const record = asRecord(payload);
  const fallback = statusText?.trim() || "Request failed";
  if (!record) return fallback;

  if (typeof record.message === "string" && record.message.trim()) {
    return record.message;
  }

  const nestedError = asRecord(record.error);
  if (
    nestedError &&
    typeof nestedError.message === "string" &&
    nestedError.message.trim()
  ) {
    return nestedError.message;
  }

  return fallback;
}

async function buildAuthHeaders(
  getAccessToken: BaseClientArgs["getAccessToken"],
  includeContentType = false,
): Promise<Record<string, string>> {
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new WorkspaceIntegrationsApiError(401, "You are not authenticated");
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (includeContentType) headers["Content-Type"] = "application/json";
  return headers;
}

function ensureBaseUrl(apiBaseUrl: string): string {
  const normalized = normalizeBaseUrl(apiBaseUrl);
  if (!normalized) {
    throw new WorkspaceIntegrationsApiError(
      500,
      "API base URL is not configured",
    );
  }
  return normalized;
}

function ensureWorkspaceId(workspaceId: string): string {
  const normalized = workspaceId.trim();
  if (!normalized) {
    throw new WorkspaceIntegrationsApiError(400, "Workspace is not selected");
  }
  return normalized;
}

function ensurePathParam(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new WorkspaceIntegrationsApiError(400, `${label} is required`);
  }
  return normalized;
}

async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function failIfNotOk(
  response: Response,
  rawPayload: unknown,
): Promise<void> {
  if (response.ok) return;
  throw new WorkspaceIntegrationsApiError(
    response.status,
    extractErrorMessage(rawPayload, response.statusText),
  );
}

// ── Domain DTO normalization (allowlist) ────────────────────────

const VALID_DOMAIN_STATUSES: ReadonlyArray<WorkspaceDomainStatus> = [
  "pending",
  "verified",
  "failed",
  "disabled",
];

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return asString(value);
}

function asDomainStatus(value: unknown): WorkspaceDomainStatus {
  if (
    typeof value === "string" &&
    (VALID_DOMAIN_STATUSES as ReadonlyArray<string>).includes(value)
  ) {
    return value as WorkspaceDomainStatus;
  }
  return "pending";
}

function normalizeDomain(value: unknown): WorkspaceDomain | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = asString(record.id);
  const hostname = asString(record.hostname);
  if (!id || !hostname) return null;

  const verificationName = asString(record.verificationName);

  // dnsRecordsFound: count-only diagnostic added in Phase B
  // (workspace-domain-verification-ux). Coerce to integer or null;
  // never trust a raw upstream value to be a number, and never carry
  // any other shape forward (e.g. an array — that would be a bug).
  let dnsRecordsFound: number | null = null;
  if (
    typeof record.dnsRecordsFound === "number" &&
    Number.isFinite(record.dnsRecordsFound)
  ) {
    dnsRecordsFound = Math.max(0, Math.trunc(record.dnsRecordsFound));
  }

  // verificationMethod is currently the only supported method (`dns_txt`).
  // Coerce any unknown/missing value to the canonical literal so the typed
  // contract is preserved without leaking arbitrary upstream strings.
  const domain: WorkspaceDomain = {
    id,
    hostname,
    status: asDomainStatus(record.status),
    verificationMethod: "dns_txt",
    verificationName: verificationName ?? "",
    lastCheckedAt: asNullableString(record.lastCheckedAt),
    verifiedAt: asNullableString(record.verifiedAt),
    failureCode: asNullableString(record.failureCode),
    failureMessage: asNullableString(record.failureMessage),
    createdAt: asString(record.createdAt),
    updatedAt: asString(record.updatedAt),
    dnsRecordsFound,
  };
  return domain;
}

function normalizeDomainList(value: unknown): WorkspaceDomain[] {
  const root = asRecord(value);
  const list = Array.isArray(root?.domains) ? root.domains : [];
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeDomain)
    .filter((d): d is WorkspaceDomain => d !== null);
}

// ── API Key DTO normalization (allowlist) ───────────────────────

const VALID_API_KEY_STATUSES: ReadonlyArray<WorkspaceApiKeyStatus> = [
  "active",
  "revoked",
  "expired",
];

function asApiKeyStatus(value: unknown): WorkspaceApiKeyStatus {
  if (
    typeof value === "string" &&
    (VALID_API_KEY_STATUSES as ReadonlyArray<string>).includes(value)
  ) {
    return value as WorkspaceApiKeyStatus;
  }
  return "active";
}

function normalizeApiKey(value: unknown): WorkspaceApiKey | null {
  const record = asRecord(value);
  if (!record) return null;

  const id = asString(record.id);
  const name = asString(record.name);
  const keyPrefix = asString(record.keyPrefix);
  const createdAt = asString(record.createdAt);
  if (!id || name === undefined || !keyPrefix || !createdAt) return null;

  return {
    id,
    name,
    keyPrefix,
    status: asApiKeyStatus(record.status),
    presetKey: asNullableString(record.presetKey),
    createdAt,
    expiresAt: asNullableString(record.expiresAt),
    lastUsedAt: asNullableString(record.lastUsedAt),
    revokedAt: asNullableString(record.revokedAt),
  };
}

function normalizeApiKeyList(value: unknown): WorkspaceApiKey[] {
  const root = asRecord(value);
  const list = Array.isArray(root?.apiKeys) ? root.apiKeys : [];
  if (!Array.isArray(list)) return [];
  return list
    .map(normalizeApiKey)
    .filter((k): k is WorkspaceApiKey => k !== null);
}

// ── Domains: list ───────────────────────────────────────────────

export async function listWorkspaceDomains(
  args: BaseClientArgs,
): Promise<WorkspaceDomain[]> {
  const baseUrl = ensureBaseUrl(args.apiBaseUrl);
  const workspaceId = ensureWorkspaceId(args.workspaceId);
  const headers = await buildAuthHeaders(args.getAccessToken);

  const response = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/domains`,
    { method: "GET", headers, signal: args.signal },
  );

  const rawPayload = await parseJson(response);
  await failIfNotOk(response, rawPayload);

  return normalizeDomainList(unwrapGatewayEnvelope(rawPayload));
}

// ── Domains: register (create) ─────────────────────────────────

export interface RegisterWorkspaceDomainArgs extends BaseClientArgs {
  hostname: string;
}

export async function registerWorkspaceDomain(
  args: RegisterWorkspaceDomainArgs,
): Promise<RegisteredWorkspaceDomain> {
  const hostname = args.hostname.trim();
  if (!hostname) {
    throw new WorkspaceIntegrationsApiError(400, "Hostname is required");
  }

  const baseUrl = ensureBaseUrl(args.apiBaseUrl);
  const workspaceId = ensureWorkspaceId(args.workspaceId);
  const headers = await buildAuthHeaders(args.getAccessToken, true);

  const response = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/domains`,
    {
      method: "POST",
      headers,
      signal: args.signal,
      body: JSON.stringify({ hostname }),
    },
  );

  const rawPayload = await parseJson(response);
  await failIfNotOk(response, rawPayload);

  const payload = unwrapGatewayEnvelope(rawPayload);
  const domain = normalizeDomain(payload);
  if (!domain) {
    throw new WorkspaceIntegrationsApiError(
      500,
      "Unexpected response while registering domain",
    );
  }

  const verificationValue = asString(asRecord(payload)?.verificationValue);
  if (!verificationValue) {
    throw new WorkspaceIntegrationsApiError(
      500,
      "Verification value missing from server response",
    );
  }

  return { domain, verificationValue };
}

// ── Domains: verify ─────────────────────────────────────────────

export interface DomainOperationArgs extends BaseClientArgs {
  domainId: string;
}

export async function verifyWorkspaceDomain(
  args: DomainOperationArgs,
): Promise<WorkspaceDomain> {
  const domainId = ensurePathParam(args.domainId, "Domain id");
  const baseUrl = ensureBaseUrl(args.apiBaseUrl);
  const workspaceId = ensureWorkspaceId(args.workspaceId);
  const headers = await buildAuthHeaders(args.getAccessToken);

  const response = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/domains/${encodeURIComponent(domainId)}/verify`,
    { method: "POST", headers, signal: args.signal },
  );

  const rawPayload = await parseJson(response);
  await failIfNotOk(response, rawPayload);

  const domain = normalizeDomain(unwrapGatewayEnvelope(rawPayload));
  if (!domain) {
    throw new WorkspaceIntegrationsApiError(
      500,
      "Unexpected response while verifying domain",
    );
  }
  return domain;
}

// ── Domains: regenerate verification ────────────────────────────

/**
 * Issue a fresh DNS TXT verification token for an existing
 * pending/failed domain row. The user clicks "Get new value" when they
 * have lost the original one-time reveal; the server stores ONLY the
 * SHA-256 hash of the verification value, so recopying an
 * already-revealed value is impossible by design — this is the supported
 * recovery path.
 *
 * Returns the same shape as `registerWorkspaceDomain` so the panel can
 * use the same one-time reveal slot.
 *
 * Backend contract: `platform.domains.regenerateVerification` (see
 * xynes-accounts-service/src/actions/handlers/integrations/domains.ts).
 * Allowed only when `status IN ('pending','failed')`; verified/disabled
 * rows return 409 CONFLICT.
 */
export async function regenerateWorkspaceDomainVerification(
  args: DomainOperationArgs,
): Promise<RegisteredWorkspaceDomain> {
  const domainId = ensurePathParam(args.domainId, "Domain id");
  const baseUrl = ensureBaseUrl(args.apiBaseUrl);
  const workspaceId = ensureWorkspaceId(args.workspaceId);
  const headers = await buildAuthHeaders(args.getAccessToken, true);

  const response = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/domains/${encodeURIComponent(domainId)}/regenerate-verification`,
    {
      method: "POST",
      headers,
      // Empty JSON body — the route is path-driven, but the gateway's
      // body-limit middleware requires a Content-Length header on POST,
      // so we send `{}` to satisfy it without leaking any state.
      body: "{}",
      signal: args.signal,
    },
  );

  const rawPayload = await parseJson(response);
  await failIfNotOk(response, rawPayload);

  const payload = unwrapGatewayEnvelope(rawPayload);
  const domain = normalizeDomain(payload);
  if (!domain) {
    throw new WorkspaceIntegrationsApiError(
      500,
      "Unexpected response while regenerating verification",
    );
  }

  const verificationValue = asString(asRecord(payload)?.verificationValue);
  if (!verificationValue) {
    // Fail closed: if the upstream omits the new raw value, the user has
    // no way to update their DNS record — surface this rather than
    // silently leaving them with a fresh hash they can't satisfy.
    throw new WorkspaceIntegrationsApiError(
      500,
      "Verification value missing from server response",
    );
  }

  return { domain, verificationValue };
}

// ── Domains: delete (soft-disable) ──────────────────────────────

export async function deleteWorkspaceDomain(
  args: DomainOperationArgs,
): Promise<void> {
  const domainId = ensurePathParam(args.domainId, "Domain id");
  const baseUrl = ensureBaseUrl(args.apiBaseUrl);
  const workspaceId = ensureWorkspaceId(args.workspaceId);
  const headers = await buildAuthHeaders(args.getAccessToken);

  const response = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/domains/${encodeURIComponent(domainId)}`,
    { method: "DELETE", headers, signal: args.signal },
  );

  if (response.ok) return;

  const rawPayload = await parseJson(response);
  await failIfNotOk(response, rawPayload);
}

// ── API Keys: list ──────────────────────────────────────────────

export async function listWorkspaceApiKeys(
  args: BaseClientArgs,
): Promise<WorkspaceApiKey[]> {
  const baseUrl = ensureBaseUrl(args.apiBaseUrl);
  const workspaceId = ensureWorkspaceId(args.workspaceId);
  const headers = await buildAuthHeaders(args.getAccessToken);

  const response = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/api-keys`,
    { method: "GET", headers, signal: args.signal },
  );

  const rawPayload = await parseJson(response);
  await failIfNotOk(response, rawPayload);

  return normalizeApiKeyList(unwrapGatewayEnvelope(rawPayload));
}

// ── API Keys: create ────────────────────────────────────────────

export interface CreateWorkspaceApiKeyArgs extends BaseClientArgs {
  name: string;
  presetKey: WorkspaceApiKeyPresetKey;
  expiresAt?: string;
}

function isKnownPresetKey(value: string): value is WorkspaceApiKeyPresetKey {
  return (WORKSPACE_API_KEY_PRESET_KEYS as ReadonlyArray<string>).includes(
    value,
  );
}

export async function createWorkspaceApiKey(
  args: CreateWorkspaceApiKeyArgs,
): Promise<CreatedWorkspaceApiKey> {
  const name = args.name.trim();
  if (!name) {
    throw new WorkspaceIntegrationsApiError(400, "Name is required");
  }
  if (!isKnownPresetKey(args.presetKey)) {
    throw new WorkspaceIntegrationsApiError(
      400,
      `Unknown API key preset: "${args.presetKey}"`,
    );
  }

  const baseUrl = ensureBaseUrl(args.apiBaseUrl);
  const workspaceId = ensureWorkspaceId(args.workspaceId);
  const headers = await buildAuthHeaders(args.getAccessToken, true);

  const body: Record<string, string> = {
    name,
    presetKey: args.presetKey,
  };
  if (args.expiresAt) body.expiresAt = args.expiresAt;

  const response = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/api-keys`,
    {
      method: "POST",
      headers,
      signal: args.signal,
      body: JSON.stringify(body),
    },
  );

  const rawPayload = await parseJson(response);
  await failIfNotOk(response, rawPayload);

  const payload = unwrapGatewayEnvelope(rawPayload);
  const key = normalizeApiKey(payload);
  if (!key) {
    throw new WorkspaceIntegrationsApiError(
      500,
      "Unexpected response while creating API key",
    );
  }

  const rawKey = asString(asRecord(payload)?.rawKey);
  if (!rawKey) {
    throw new WorkspaceIntegrationsApiError(
      500,
      "Raw key missing from server response",
    );
  }

  return { key, rawKey };
}

// ── API Keys: revoke ────────────────────────────────────────────

export interface RevokeWorkspaceApiKeyArgs extends BaseClientArgs {
  keyId: string;
}

export async function revokeWorkspaceApiKey(
  args: RevokeWorkspaceApiKeyArgs,
): Promise<WorkspaceApiKey> {
  const keyId = ensurePathParam(args.keyId, "API key id");
  const baseUrl = ensureBaseUrl(args.apiBaseUrl);
  const workspaceId = ensureWorkspaceId(args.workspaceId);
  const headers = await buildAuthHeaders(args.getAccessToken);

  const response = await fetch(
    `${baseUrl}/workspaces/${encodeURIComponent(workspaceId)}/api-keys/${encodeURIComponent(keyId)}/revoke`,
    { method: "POST", headers, signal: args.signal },
  );

  const rawPayload = await parseJson(response);
  await failIfNotOk(response, rawPayload);

  const key = normalizeApiKey(unwrapGatewayEnvelope(rawPayload));
  if (!key) {
    throw new WorkspaceIntegrationsApiError(
      500,
      "Unexpected response while revoking API key",
    );
  }
  return key;
}
