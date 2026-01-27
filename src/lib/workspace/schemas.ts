/**
 * Workspace Form Schemas
 *
 * Zod validation schemas for workspace-related forms.
 * Integrates with react-hook-form for form validation.
 *
 * @module workspace/schemas
 */

import { z } from "zod";
import { SLUG_CONSTRAINTS, NAME_CONSTRAINTS } from "./validation";

/**
 * Zod schema for workspace name validation
 */
export const workspaceNameSchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(
    z
      .string()
      .min(1, "Workspace name is required")
      .min(
        NAME_CONSTRAINTS.MIN_LENGTH,
        `Workspace name must be at least ${NAME_CONSTRAINTS.MIN_LENGTH} characters`
      )
      .max(
        NAME_CONSTRAINTS.MAX_LENGTH,
        `Workspace name must be at most ${NAME_CONSTRAINTS.MAX_LENGTH} characters`
      )
  );

/**
 * Zod schema for workspace slug validation
 */
export const workspaceSlugSchema = z
  .string()
  .min(1, "Workspace URL is required")
  .min(
    SLUG_CONSTRAINTS.MIN_LENGTH,
    `Must be at least ${SLUG_CONSTRAINTS.MIN_LENGTH} characters`
  )
  .max(
    SLUG_CONSTRAINTS.MAX_LENGTH,
    `Must be at most ${SLUG_CONSTRAINTS.MAX_LENGTH} characters`
  )
  .regex(/^[a-z]/, "Must start with a letter")
  .regex(/^[a-z0-9-]+$/, "Can only contain lowercase letters, numbers, and hyphens")
  .refine((val) => !val.includes("--"), {
    message: "Cannot contain consecutive hyphens",
  })
  .refine((val) => !val.endsWith("-"), {
    message: "Cannot end with a hyphen",
  });

/**
 * Zod schema for create workspace form
 */
export const createWorkspaceFormSchema = z.object({
  name: workspaceNameSchema,
  slug: workspaceSlugSchema,
});

/**
 * Type for create workspace form data
 */
export type CreateWorkspaceFormData = z.infer<typeof createWorkspaceFormSchema>;
