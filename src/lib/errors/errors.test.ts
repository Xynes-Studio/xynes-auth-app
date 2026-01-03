import { describe, it, expect } from "vitest";
import {
  normalizeAuthError,
  isRetryableError,
  getErrorMessage,
} from "./index";

describe("Error utilities re-exports", () => {
  describe("normalizeAuthError", () => {
    it("should normalize Supabase error by matching message patterns", () => {
      const error = new Error("Invalid login credentials");
      const result = normalizeAuthError(error);
      expect(result.code).toBe("invalid_credentials");
      expect(result.message).toBe("Invalid email or password. Please try again.");
    });

    it("should return user-friendly message for string errors", () => {
      // SDK normalizes all errors to user-friendly messages
      const result = normalizeAuthError("Something went wrong");
      expect(result.code).toBe("unknown_error");
      expect(result.message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should handle unknown errors", () => {
      const result = normalizeAuthError(null);
      expect(result.code).toBe("unknown_error");
      expect(result.message).toBe("An unexpected error occurred. Please try again.");
    });

    it("should normalize AuthError objects by code", () => {
      const authError = {
        message: "Email not confirmed",
        status: 400,
        code: "email_not_confirmed",
      };
      const result = normalizeAuthError(authError);
      expect(result.code).toBe("email_not_verified");
      expect(result.message).toBe("Please verify your email before signing in.");
    });

    it("should handle user_already_exists error", () => {
      const error = { code: "user_already_exists", message: "User already registered" };
      const result = normalizeAuthError(error);
      expect(result.code).toBe("email_already_exists");
    });

    it("should handle network errors", () => {
      const error = new Error("Failed to fetch");
      const result = normalizeAuthError(error);
      expect(result.code).toBe("network_error");
    });
  });

  describe("isRetryableError", () => {
    it("should return true for network errors", () => {
      expect(isRetryableError("network_error")).toBe(true);
    });

    it("should return true for rate limited errors", () => {
      expect(isRetryableError("rate_limited")).toBe(true);
    });

    it("should return false for invalid credentials", () => {
      expect(isRetryableError("invalid_credentials")).toBe(false);
    });

    it("should return false for email_not_verified", () => {
      expect(isRetryableError("email_not_verified")).toBe(false);
    });

    it("should return false for unknown_error", () => {
      expect(isRetryableError("unknown_error")).toBe(false);
    });
  });

  describe("getErrorMessage", () => {
    // getErrorMessage takes an AuthErrorCode, not an arbitrary error
    it("should return message for invalid_credentials code", () => {
      expect(getErrorMessage("invalid_credentials")).toBe("Invalid email or password. Please try again.");
    });

    it("should return message for email_not_verified code", () => {
      expect(getErrorMessage("email_not_verified")).toBe("Please verify your email before signing in.");
    });

    it("should return message for network_error code", () => {
      expect(getErrorMessage("network_error")).toBe("Unable to connect. Please check your internet connection.");
    });

    it("should return message for unknown_error code", () => {
      expect(getErrorMessage("unknown_error")).toBe("An unexpected error occurred. Please try again.");
    });

    it("should return fallback for unrecognized codes", () => {
      // @ts-expect-error - testing invalid code
      expect(getErrorMessage("not_a_real_code")).toBe("An unexpected error occurred. Please try again.");
    });
  });
});
