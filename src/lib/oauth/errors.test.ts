import { describe, it, expect } from "vitest";
import {
  getOAuthErrorMessage,
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
});
