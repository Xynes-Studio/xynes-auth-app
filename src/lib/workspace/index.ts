/**
 * Workspace Utilities
 *
 * Exports for workspace-related functionality including validation,
 * slug generation, and API integration.
 *
 * @module workspace
 */

// Validation utilities
export {
  validateWorkspaceName,
  validateWorkspaceSlug,
  generateSlugFromName,
  debounce,
  getSlugStatusMessage,
  NAME_CONSTRAINTS,
  SLUG_CONSTRAINTS,
  type SlugValidationResult,
  type NameValidationResult,
  type SlugAvailabilityStatus,
  type SlugStatus,
} from "./validation";

// Form schemas
export {
  workspaceNameSchema,
  workspaceSlugSchema,
  createWorkspaceFormSchema,
  type CreateWorkspaceFormData,
} from "./schemas";

export {
  WORKSPACE_ADMIN_FALLBACK_PATH,
  normalizeWorkspaceSlugForCmsPath,
  buildCmsWorkspaceContentPath,
  normalizeConsoleBaseUrl,
  buildCmsWorkspaceContentUrl,
} from "./console-url";
