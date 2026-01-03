import { describe, it, expect } from "vitest";
import {
  signupFormSchema,
  loginFormSchema,
  getPasswordStrength,
  validateEmail,
  validatePassword,
} from "./index";

describe("signupFormSchema", () => {
  it("should validate correct signup data", () => {
    const result = signupFormSchema.safeParse({
      email: "test@example.com",
      password: "ValidPass123",
      confirmPassword: "ValidPass123",
    });

    expect(result.success).toBe(true);
  });

  it("should reject invalid email", () => {
    const result = signupFormSchema.safeParse({
      email: "invalid-email",
      password: "ValidPass123",
      confirmPassword: "ValidPass123",
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
      confirmPassword: "Short1",
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
      confirmPassword: "lowercase123",
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
      confirmPassword: "UPPERCASE123",
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
      confirmPassword: "NoNumbersHere",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("number");
    }
  });

  it("should reject mismatched passwords", () => {
    const result = signupFormSchema.safeParse({
      email: "test@example.com",
      password: "ValidPass123",
      confirmPassword: "DifferentPass123",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("do not match");
    }
  });

  it("should reject empty email", () => {
    const result = signupFormSchema.safeParse({
      email: "",
      password: "ValidPass123",
      confirmPassword: "ValidPass123",
    });

    expect(result.success).toBe(false);
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

  it("should validate login with rememberMe", () => {
    const result = loginFormSchema.safeParse({
      email: "test@example.com",
      password: "anypassword",
      rememberMe: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberMe).toBe(true);
    }
  });

  it("should default rememberMe to false", () => {
    const result = loginFormSchema.safeParse({
      email: "test@example.com",
      password: "anypassword",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rememberMe).toBe(false);
    }
  });

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
