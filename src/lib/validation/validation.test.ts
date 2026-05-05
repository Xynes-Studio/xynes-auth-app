import { describe, it, expect } from "vitest";
import {
  signupFormSchema,
  loginFormSchema,
  forgotPasswordFormSchema,
  resetPasswordFormSchema,
  getPasswordStrength,
  validateEmail,
  validatePassword,
} from "./index";

const MAX_PASSWORD_LENGTH = 128;

describe("signupFormSchema", () => {
  it("should validate correct signup data", () => {
    const result = signupFormSchema.safeParse({
      email: "test@example.com",
      password: "ValidPass123",
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = signupFormSchema.safeParse({
      email: "invalid-email",
      password: "ValidPass123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("email");
    }
  });

  it("should reject short password", () => {
    const result = signupFormSchema.safeParse({
      email: "test@example.com",
      password: "Short1",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("8 characters");
    }
  });

  it("should reject password without uppercase", () => {
    const result = signupFormSchema.safeParse({
      email: "test@example.com",
      password: "lowercase123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("uppercase");
    }
  });

  it("should reject password without lowercase", () => {
    const result = signupFormSchema.safeParse({
      email: "test@example.com",
      password: "UPPERCASE123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("lowercase");
    }
  });

  it("should reject password without number", () => {
    const result = signupFormSchema.safeParse({
      email: "test@example.com",
      password: "NoNumbersHere",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("number");
    }
  });

  it("should reject empty email", () => {
    const result = signupFormSchema.safeParse({
      email: "",
      password: "ValidPass123",
    });

    expect(result.success).toBe(false);
  });

  it("should reject overly long passwords", () => {
    const longPassword = "A1a".padEnd(MAX_PASSWORD_LENGTH + 1, "x");
    const result = signupFormSchema.safeParse({
      email: "test@example.com",
      password: longPassword,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("128");
    }
  });
});

describe("loginFormSchema", () => {
  it("should validate correct login data", () => {
    const result = loginFormSchema.safeParse({
      email: "test@example.com",
      password: "anypassword",
    });

    expect(result.success).toBe(true);
  });

  // Note: rememberMe tests removed - feature will be added in SEC-FE-1.8

  it("should reject invalid email", () => {
    const result = loginFormSchema.safeParse({
      email: "invalid",
      password: "anypassword",
    });

    expect(result.success).toBe(false);
  });

  it("should reject empty password", () => {
    const result = loginFormSchema.safeParse({
      email: "test@example.com",
      password: "",
    });

    expect(result.success).toBe(false);
  });

  it("should reject overly long passwords", () => {
    const longPassword = "A1a".padEnd(MAX_PASSWORD_LENGTH + 1, "x");
    const result = loginFormSchema.safeParse({
      email: "test@example.com",
      password: longPassword,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("128");
    }
  });
});

describe("forgotPasswordFormSchema", () => {
  it("should validate correct email", () => {
    const result = forgotPasswordFormSchema.safeParse({
      email: "test@example.com",
    });

    expect(result.success).toBe(true);
  });

  it("should reject empty email", () => {
    const result = forgotPasswordFormSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
  });

  it("should reject invalid email", () => {
    const result = forgotPasswordFormSchema.safeParse({ email: "invalid" });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordFormSchema", () => {
  it("should validate correct passwords", () => {
    const result = resetPasswordFormSchema.safeParse({
      password: "ValidPass123",
      confirmPassword: "ValidPass123",
    });
    expect(result.success).toBe(true);
  });

  it("should reject weak passwords", () => {
    const result = resetPasswordFormSchema.safeParse({
      password: "weak",
      confirmPassword: "weak",
    });
    expect(result.success).toBe(false);
  });

  it("should reject mismatched passwords", () => {
    const result = resetPasswordFormSchema.safeParse({
      password: "ValidPass123",
      confirmPassword: "DifferentPass123",
    });
    expect(result.success).toBe(false);
  });
});

describe("SDK re-exports", () => {
  describe("validateEmail", () => {
    it("should validate correct email", () => {
      const result = validateEmail("test@example.com");
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = validateEmail("invalid");
      expect(result.isValid).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should validate correct password", () => {
      const result = validatePassword("ValidPass123");
      expect(result.isValid).toBe(true);
    });

    it("should reject weak password", () => {
      const result = validatePassword("weak");
      expect(result.isValid).toBe(false);
    });
  });

  describe("getPasswordStrength", () => {
    it("should return weak for short passwords", () => {
      expect(getPasswordStrength("abc")).toBe("weak");
    });

    it("should return strong for complex passwords", () => {
      expect(getPasswordStrength("StrongPass123!")).toBe("strong");
    });
  });
});
