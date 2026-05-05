export type InviteTokenResult =
  | { token: string }
  | { error: "empty" | "invalid" | "length" };

const TOKEN_PATTERN = /^[A-Za-z0-9._-]+$/;
const MIN_TOKEN_LENGTH = 16;
const MAX_TOKEN_LENGTH = 128;

const INVITE_PATH_REGEX = /\/invite\/([^/?#]+)(?:[/?#]|$)/i;

export function normalizeInviteToken(input: string): InviteTokenResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { error: "empty" };
  }

  let candidate = trimmed;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/invite\/([^/]+)\/?$/i);
    if (match?.[1]) {
      candidate = match[1];
    }
  } catch {
    const match = trimmed.match(INVITE_PATH_REGEX);
    if (match?.[1]) {
      candidate = match[1];
    }
  }

  const normalized = candidate.trim();
  if (!normalized) {
    return { error: "empty" };
  }

  if (!TOKEN_PATTERN.test(normalized)) {
    return { error: "invalid" };
  }

  if (
    normalized.length < MIN_TOKEN_LENGTH ||
    normalized.length > MAX_TOKEN_LENGTH
  ) {
    return { error: "length" };
  }

  return { token: normalized };
}
