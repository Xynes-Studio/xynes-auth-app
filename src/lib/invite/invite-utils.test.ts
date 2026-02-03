import { describe, expect, it } from "vitest";
import { normalizeInviteToken } from "./invite-utils";

describe("normalizeInviteToken", () => {
  it("returns error for empty input", () => {
    expect(normalizeInviteToken(" ")).toEqual({ error: "empty" });
  });

  it("accepts a raw token", () => {
    const token = "a".repeat(32);
    expect(normalizeInviteToken(token)).toEqual({ token });
  });

  it("extracts token from invite URL", () => {
    const token = "b".repeat(32);
    expect(
      normalizeInviteToken(`http://localhost:3100/invite/${token}`),
    ).toEqual({ token });
  });

  it("extracts token from invite URL with query", () => {
    const token = "c".repeat(32);
    expect(
      normalizeInviteToken(`https://auth.xynes.com/invite/${token}?utm=share`),
    ).toEqual({ token });
  });

  it("returns error for invalid token characters", () => {
    expect(normalizeInviteToken("abc 123")).toEqual({ error: "invalid" });
    expect(normalizeInviteToken("abc/123")).toEqual({ error: "invalid" });
  });

  it("returns error when token is too short", () => {
    expect(normalizeInviteToken("short")).toEqual({ error: "length" });
  });

  it("returns error when token is too long", () => {
    const tooLong = "a".repeat(129);
    expect(normalizeInviteToken(tooLong)).toEqual({ error: "length" });
  });
});
