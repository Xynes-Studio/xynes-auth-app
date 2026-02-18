export type UnknownRecord = Record<string, unknown>;

export function asRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as UnknownRecord;
}

export function unwrapGatewayEnvelope(value: unknown): unknown {
  let current: unknown = value;
  while (asRecord(current)?.data !== undefined) {
    current = asRecord(current)?.data;
  }
  return current;
}
