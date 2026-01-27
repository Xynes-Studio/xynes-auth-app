/**
 * Workspace Validation Utilities
 *
 * Pure functions for validating workspace-related inputs.
 * These are designed to be testable without React dependencies.
 *
 * @module workspace/validation
 */

/**
 * Workspace slug validation result
 */
export interface SlugValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Workspace name validation result
 */
export interface NameValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Slug validation constraints
 */
export const SLUG_CONSTRAINTS = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 50,
  /** Regex pattern: lowercase letters, numbers, hyphens only, must start with letter */
  PATTERN: /^[a-z][a-z0-9-]*[a-z0-9]$|^[a-z]$/,
  /** Pattern for short slugs (3 chars, can be just letters) */
  SHORT_PATTERN: /^[a-z][a-z0-9]{2}$|^[a-z][a-z0-9]-?[a-z0-9]$|^[a-z]{3}$/,
} as const;

/**
 * Workspace name validation constraints
 */
export const NAME_CONSTRAINTS = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 100,
} as const;

/**
 * Validates a workspace name
 *
 * Rules:
 * - 2-100 characters
 * - Trimmed whitespace
 *
 * @param name - The workspace name to validate
 * @returns Validation result with error message if invalid
 */
export function validateWorkspaceName(name: string): NameValidationResult {
  const trimmedName = name?.trim() ?? "";

  if (!trimmedName) {
    return { isValid: false, error: "Workspace name is required" };
  }

  if (trimmedName.length < NAME_CONSTRAINTS.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Workspace name must be at least ${NAME_CONSTRAINTS.MIN_LENGTH} characters`,
    };
  }

  if (trimmedName.length > NAME_CONSTRAINTS.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Workspace name must be at most ${NAME_CONSTRAINTS.MAX_LENGTH} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a workspace slug format
 *
 * Rules:
 * - 3-50 characters
 * - Lowercase letters, numbers, hyphens only
 * - Must start with a letter
 * - Must end with a letter or number
 * - No consecutive hyphens
 *
 * @param slug - The workspace slug to validate
 * @returns Validation result with error message if invalid
 */
export function validateWorkspaceSlug(slug: string): SlugValidationResult {
  if (!slug) {
    return { isValid: false, error: "Workspace URL is required" };
  }

  if (slug.length < SLUG_CONSTRAINTS.MIN_LENGTH) {
    return {
      isValid: false,
      error: `Must be at least ${SLUG_CONSTRAINTS.MIN_LENGTH} characters`,
    };
  }

  if (slug.length > SLUG_CONSTRAINTS.MAX_LENGTH) {
    return {
      isValid: false,
      error: `Must be at most ${SLUG_CONSTRAINTS.MAX_LENGTH} characters`,
    };
  }

  // Check for uppercase letters
  if (/[A-Z]/.test(slug)) {
    return {
      isValid: false,
      error: "Must be lowercase only",
    };
  }

  // Check if starts with letter
  if (!/^[a-z]/.test(slug)) {
    return {
      isValid: false,
      error: "Must start with a letter",
    };
  }

  // Check for consecutive hyphens
  if (/--/.test(slug)) {
    return {
      isValid: false,
      error: "Cannot contain consecutive hyphens",
    };
  }

  // Check for ending with hyphen
  if (slug.endsWith("-")) {
    return {
      isValid: false,
      error: "Cannot end with a hyphen",
    };
  }

  // Check for invalid characters
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return {
      isValid: false,
      error: "Can only contain lowercase letters, numbers, and hyphens",
    };
  }

  return { isValid: true };
}

/**
 * Generates a slug from a workspace name
 *
 * Transformation rules:
 * - Convert to lowercase
 * - Replace spaces and underscores with hyphens
 * - Remove non-alphanumeric characters (except hyphens)
 * - Replace multiple consecutive hyphens with single hyphen
 * - Remove leading/trailing hyphens
 * - Ensure starts with a letter (prepend 'w-' if starts with number)
 * - Truncate to max length
 *
 * @param name - The workspace name to convert
 * @returns Generated slug
 */
export function generateSlugFromName(name: string): string {
  if (!name) {
    return "";
  }

  let slug = name
    .toLowerCase()
    .trim()
    // Replace spaces and underscores with hyphens
    .replace(/[\s_]+/g, "-")
    // Remove non-alphanumeric characters (except hyphens)
    .replace(/[^a-z0-9-]/g, "")
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/-+/g, "-")
    // Remove leading hyphens
    .replace(/^-+/, "")
    // Remove trailing hyphens
    .replace(/-+$/, "");

  // Ensure starts with a letter
  if (slug && /^[0-9]/.test(slug)) {
    slug = `w-${slug}`;
  }

  // Truncate to max length, but don't end with hyphen
  if (slug.length > SLUG_CONSTRAINTS.MAX_LENGTH) {
    slug = slug.substring(0, SLUG_CONSTRAINTS.MAX_LENGTH);
    // Remove trailing hyphen if present after truncation
    slug = slug.replace(/-+$/, "");
  }

  return slug;
}

/**
 * Debounce utility for slug availability checking
 *
 * @param fn - The function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * Slug availability status
 */
export type SlugAvailabilityStatus =
  | "idle"
  | "checking"
  | "available"
  | "unavailable"
  | "error";

/**
 * Slug validation status for UI display
 */
export interface SlugStatus {
  status: SlugAvailabilityStatus;
  message?: string;
}

/**
 * Get user-friendly message for slug availability status
 *
 * @param status - The availability status
 * @param slug - The slug being checked
 * @returns User-friendly message
 */
export function getSlugStatusMessage(
  status: SlugAvailabilityStatus,
  slug: string
): string {
  switch (status) {
    case "idle":
      return "";
    case "checking":
      return "Checking availability...";
    case "available":
      return `"${slug}" is available!`;
    case "unavailable":
      return `"${slug}" is already taken`;
    case "error":
      return "Could not check availability. Please try again.";
  }
}
