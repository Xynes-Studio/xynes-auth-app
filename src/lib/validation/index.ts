/**
 * Auth App Validation - Zod Schemas for Form Validation
 *
 * This module provides Zod schemas for form validation in the auth app.
 * It re-exports utilities from @xynes/auth-sdk for consistency.
 *
 * @module validation
 */

import { z } from "zod";

// Re-export SDK utilities for convenience
export {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  PASSWORD_STRENGTH_CONFIG,
  type PasswordStrength,
  type ValidationResult,
} from "@xynes/auth-sdk";

export const MAX_PASSWORD_LENGTH = 128;
export const MAX_PASSWORD_INPUT_LENGTH = 256;

/**
 * Zod schema for signup form validation
 *
 * Validates:
 * - Email: Required, valid format
 * - Password: Min 8 chars, uppercase, lowercase, number
 * - Confirm Password: Must match password
 */
export const signupFormSchema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`)
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password")
      .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/**
 * Type for signup form data
 */
export type SignupFormData = z.infer<typeof signupFormSchema>;

/**
 * Zod schema for login form validation
 * 
 * Note: rememberMe functionality will be added in a future story
 * when session management (SEC-FE-1.8) is implemented.
 */
export const loginFormSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .max(MAX_PASSWORD_LENGTH, `Password must be at most ${MAX_PASSWORD_LENGTH} characters`),
});

/**
 * Type for login form data
 */
export type LoginFormData = z.infer<typeof loginFormSchema>;
