import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { asRecord, unwrapGatewayEnvelope } from "@/lib/http/envelope";

function extractErrorMessage(payload: unknown): string {
  const record = asRecord(payload);
  if (!record) return "Request failed";

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

  return "Request failed";
}

export class ProfileApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "ProfileApiError";
    this.statusCode = statusCode;
  }
}

export interface ProfileUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface MeBootstrapResult {
  user: ProfileUser | null;
  workspaces: Array<{ slug?: string | null }>;
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function normalizeUser(payload: unknown): ProfileUser | null {
  const root = asRecord(payload);
  const userRecord = asRecord(root?.user) ?? root;
  if (!userRecord) return null;

  const id = typeof userRecord.id === "string" ? userRecord.id : "";
  const email = typeof userRecord.email === "string" ? userRecord.email : "";
  if (!id || !email) return null;

  return {
    id,
    email,
    displayName:
      typeof userRecord.displayName === "string" ? userRecord.displayName : null,
    avatarUrl:
      typeof userRecord.avatarUrl === "string" ? userRecord.avatarUrl : null,
  };
}

export async function fetchMeBootstrap(): Promise<MeBootstrapResult> {
  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (!apiBaseUrl) {
    throw new ProfileApiError(500, "API base URL is not configured");
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ProfileApiError(401, "You are not authenticated");
  }

  const response = await fetch(`${apiBaseUrl}/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  const rawPayload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ProfileApiError(
      response.status,
      extractErrorMessage(rawPayload) || response.statusText,
    );
  }

  const payload = unwrapGatewayEnvelope(rawPayload);
  const record = asRecord(payload);

  const workspaces = Array.isArray(record?.workspaces)
    ? (record?.workspaces as Array<{ slug?: string | null }>)
    : [];

  return {
    user: normalizeUser(payload),
    workspaces,
  };
}

export async function updateSelfProfile(displayName: string): Promise<ProfileUser> {
  const normalizedName = displayName.trim();
  if (!normalizedName) {
    throw new ProfileApiError(400, "Display name is required");
  }

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  if (!apiBaseUrl) {
    throw new ProfileApiError(500, "API base URL is not configured");
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new ProfileApiError(401, "You are not authenticated");
  }

  const response = await fetch(`${apiBaseUrl}/me/profile`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ displayName: normalizedName }),
  });

  const rawPayload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ProfileApiError(
      response.status,
      extractErrorMessage(rawPayload) || response.statusText,
    );
  }

  const payload = unwrapGatewayEnvelope(rawPayload);
  const user = normalizeUser(payload);
  if (!user) {
    throw new ProfileApiError(500, "Unexpected profile response");
  }

  return user;
}
