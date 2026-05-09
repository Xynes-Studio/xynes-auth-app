import { describe, it, expect } from "vitest";
import {
  getOAuthErrorMessage,
  getOAuthErrorMessageKey,
  OAUTH_ERROR_MESSAGES,
} from "./errors";

describe("OAuth Error Utilities", () => {
  describe("OAUTH_ERROR_MESSAGES", () => {
    it("should have message for access_denied", () => {
      expect(OAUTH_ERROR_MESSAGES.access_denied).toContain("denied");
    });

    it("should have message for invalid_request", () => {
      expect(OAUTH_ERROR_MESSAGES.invalid_request).toContain("invalid");
    });

    it("should have message for server_error", () => {
      expect(OAUTH_ERROR_MESSAGES.server_error).toContain("server");
    });

    it("should have message for auth_callback_error", () => {
      expect(OAUTH_ERROR_MESSAGES.auth_callback_error).toContain("error");
    });
  });

  describe("getOAuthErrorMessage", () => {
    it("should return mapped message for known error codes", () => {
      const result = getOAuthErrorMessage("access_denied");
      expect(result).toBe(OAUTH_ERROR_MESSAGES.access_denied);
    });

    it("should return generic message for unknown error codes", () => {
      const result = getOAuthErrorMessage("unknown_error");
      expect(result).toContain("Something went wrong");
    });

    it("should return correct message for each error type", () => {
      expect(getOAuthErrorMessage("invalid_request")).toContain("invalid");
      expect(getOAuthErrorMessage("unauthorized_client")).toContain(
        "not authorized"
      );
      expect(getOAuthErrorMessage("unsupported_response_type")).toContain(
        "unsupported"
      );
      expect(getOAuthErrorMessage("invalid_scope")).toContain("scope");
      expect(getOAuthErrorMessage("temporarily_unavailable")).toContain(
        "unavailable"
      );
      expect(getOAuthErrorMessage("server_error")).toContain("server");
    });

    it("should never expose provider-supplied descriptions (XSS prevention)", () => {
      // getOAuthErrorMessage only accepts errorCode, no description parameter
      // This ensures we never pass through potentially malicious provider text
      const result = getOAuthErrorMessage("access_denied");
      expect(result).toBe(OAUTH_ERROR_MESSAGES.access_denied);
      expect(result).not.toContain("<script>");
    });
  });

  describe("getOAuthErrorMessageKey", () => {
    it("returns the canonical key for every known OAuth error code", () => {
      const known = [
        "access_denied",
        "invalid_request",
        "unauthorized_client",
        "unsupported_response_type",
        "invalid_scope",
        "server_error",
        "temporarily_unavailable",
        "auth_callback_error",
      ] as const;
      for (const code of known) {
        expect(getOAuthErrorMessageKey(code)).toBe(code);
      }
    });

    it("collapses unknown error codes to the safe `fallback` key", () => {
      expect(getOAuthErrorMessageKey("unknown_error")).toBe("fallback");
      expect(getOAuthErrorMessageKey("")).toBe("fallback");
      expect(getOAuthErrorMessageKey("../etc/passwd")).toBe("fallback");
    });

    it("never echoes the raw error code into the returned key", () => {
      // The translation key is always a fixed enum value drawn from a
      // closed set, so a hostile provider cannot influence what is
      // looked up in the catalog.
      const hostile = "<script>alert(1)</script>";
      const key = getOAuthErrorMessageKey(hostile);
      expect(key).toBe("fallback");
      expect(key).not.toContain("<");
    });
  });
});
