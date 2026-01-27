"use client";

/**
 * CreateWorkspaceForm Component
 *
 * A form for creating a new workspace during onboarding.
 * Features auto-generation of slug from name, real-time slug validation,
 * and availability checking.
 *
 * @module onboarding/CreateWorkspaceForm
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Button, Alert, Card, CardContent, Spinner } from "@lumia-ui/components";
import { createClient } from "@/lib/supabase/client";
import { getSafeRedirectUrl, getAllowedRedirectDomains } from "@/lib/redirect";
import {
  createWorkspaceFormSchema,
  type CreateWorkspaceFormData,
  generateSlugFromName,
  validateWorkspaceSlug,
  debounce,
  getSlugStatusMessage,
  type SlugAvailabilityStatus,
  SLUG_CONSTRAINTS,
} from "@/lib/workspace";

/**
 * Workspace type returned from API
 */
interface Workspace {
  id: string;
  name: string;
  slug: string;
}

/**
 * CreateWorkspaceForm props
 */
export interface CreateWorkspaceFormProps {
  /** Base URL for the accounts API */
  apiBaseUrl?: string;
  /** Callback when workspace is created successfully */
  onSuccess?: (workspace: Workspace) => void;
  /**
   * URL to redirect to after success (default: workspace dashboard)
   * Note: This URL is validated against allowed domains to prevent open redirects
   */
  redirectUrl?: string;
}

/**
 * CreateWorkspaceForm Component
 *
 * Provides a friendly onboarding UI for creating the first workspace.
 */
export function CreateWorkspaceForm({
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "",
  onSuccess,
  redirectUrl,
}: CreateWorkspaceFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slugStatus, setSlugStatus] = useState<SlugAvailabilityStatus>("idle");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const slugCheckAbortController = useRef<AbortController | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors, isValid },
  } = useForm<CreateWorkspaceFormData>({
    resolver: zodResolver(createWorkspaceFormSchema),
    mode: "onBlur",
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const nameValue = watch("name");
  const slugValue = watch("slug");

  /**
   * Check slug availability via API
   */
  const checkSlugAvailability = useCallback(
    async (slug: string) => {
      // Cancel any pending request
      if (slugCheckAbortController.current) {
        slugCheckAbortController.current.abort();
      }

      // Validate slug format first
      const validation = validateWorkspaceSlug(slug);
      if (!validation.isValid) {
        setSlugStatus("idle");
        return;
      }

      setSlugStatus("checking");
      slugCheckAbortController.current = new AbortController();

      try {
        const response = await fetch(
          `${apiBaseUrl}/workspaces/check-slug/${slug}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            signal: slugCheckAbortController.current.signal,
          }
        );

        if (!response.ok) {
          setSlugStatus("error");
          return;
        }

        const data = await response.json();
        setSlugStatus(data.available ? "available" : "unavailable");
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return; // Ignore aborted requests
        }
        setSlugStatus("error");
      }
    },
    [apiBaseUrl]
  );

  // Debounced slug availability check
  const debouncedCheckSlug = useMemo(
    () =>
      debounce((slug: string) => {
        checkSlugAvailability(slug);
      }, 500),
    [checkSlugAvailability]
  );

  // Auto-generate slug from name
  useEffect(() => {
    if (!isSlugManuallyEdited && nameValue) {
      const generatedSlug = generateSlugFromName(nameValue);
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  }, [nameValue, isSlugManuallyEdited, setValue]);

  // Check slug availability when it changes
  useEffect(() => {
    if (slugValue && slugValue.length >= SLUG_CONSTRAINTS.MIN_LENGTH) {
      debouncedCheckSlug(slugValue);
    } else {
      setSlugStatus("idle");
    }
  }, [slugValue, debouncedCheckSlug]);

  /**
   * Handle slug input change - mark as manually edited
   */
  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setIsSlugManuallyEdited(true);
      setValue("slug", e.target.value, { shouldValidate: true });
    },
    [setValue]
  );

  /**
   * Get access token for API calls
   */
  const getAccessToken = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  /**
   * Handle form submission
   */
  const onSubmit = useCallback(
    async (data: CreateWorkspaceFormData) => {
      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const token = await getAccessToken();

        const response = await fetch(`${apiBaseUrl}/workspaces`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({
            name: data.name.trim(),
            slug: data.slug,
          }),
        });

        if (!response.ok) {
          if (response.status === 409) {
            setSubmitError("A workspace with this URL already exists");
            setSlugStatus("unavailable");
            return;
          }

          // Generic error message to prevent information leakage
          setSubmitError("Failed to create workspace. Please try again.");
          return;
        }

        const workspace: Workspace = await response.json();

        // Call success callback if provided
        onSuccess?.(workspace);

        // Calculate default target (workspace console)
        const defaultTarget = `${process.env.NEXT_PUBLIC_CONSOLE_URL || ""}/${
          workspace.slug
        }`;

        // Determine final redirect URL
        // If a redirectUrl is provided, we must validate it to prevent open redirects
        const targetUrl = redirectUrl
          ? getSafeRedirectUrl(
              redirectUrl,
              defaultTarget,
              getAllowedRedirectDomains()
            )
          : defaultTarget;

        router.push(targetUrl);
      } catch (error) {
        setSubmitError("An unexpected error occurred. Please try again.");
        // Log the actual error to console for debugging, but don't show to user
        console.error("Failed to create workspace:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [apiBaseUrl, getAccessToken, onSuccess, redirectUrl, router]
  );

  /**
   * Determine if submit button should be disabled
   */
  const isSubmitDisabled =
    !isValid ||
    isSubmitting ||
    slugStatus === "unavailable" ||
    slugStatus === "checking";

  /**
   * Get slug status indicator
   */
  const renderSlugStatus = () => {
    if (!slugValue || errors.slug) return null;

    const message = getSlugStatusMessage(slugStatus, slugValue);
    if (!message) return null;

    return (
      <div
        className={`flex items-center gap-2 text-sm ${
          slugStatus === "available"
            ? "text-emerald-600"
            : slugStatus === "unavailable"
            ? "text-red-600"
            : slugStatus === "error"
            ? "text-amber-600"
            : "text-muted-foreground"
        }`}
        role="status"
        aria-live="polite"
      >
        {slugStatus === "checking" && <Spinner size="sm" aria-hidden="true" />}
        {slugStatus === "available" && (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
        {slugStatus === "unavailable" && (
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
        <span>{message}</span>
      </div>
    );
  };

  return (
    <div className="w-full max-w-lg">
      <Card>
        <CardContent className="pt-6">
          <div className="mb-8 text-center">
            <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <svg
                className="h-7 w-7 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Create Your Workspace
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set up your team&apos;s workspace to get started. You can invite
              team members later.
            </p>
          </div>

          {submitError && (
            <Alert
              variant="error"
              title="Error"
              description={submitError}
              className="mb-6"
              closable
              onClose={() => setSubmitError(null)}
            />
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Workspace Name Field */}
            <div className="space-y-2">
              <label
                htmlFor="workspace-name"
                className="block text-sm font-medium text-foreground"
              >
                Workspace Name
              </label>
              <input
                id="workspace-name"
                type="text"
                placeholder="e.g., Acme Corporation"
                autoComplete="organization"
                className={`w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                  ${
                    errors.name
                      ? "border-red-500 focus:ring-red-500"
                      : "border-border hover:border-muted-foreground/50"
                  }`}
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
                {...register("name")}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-red-600" role="alert">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Workspace Slug Field */}
            <div className="space-y-2">
              <label
                htmlFor="workspace-slug"
                className="block text-sm font-medium text-foreground"
              >
                Workspace URL
              </label>
              <div className="flex items-center gap-0">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                  xynes.com/
                </span>
                <input
                  id="workspace-slug"
                  type="text"
                  placeholder="your-workspace"
                  autoComplete="off"
                  className={`w-full rounded-r-md border px-3 py-2 text-sm shadow-sm transition-colors
                    focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                    ${
                      errors.slug
                        ? "border-red-500 focus:ring-red-500"
                        : "border-border hover:border-muted-foreground/50"
                    }`}
                  aria-invalid={errors.slug ? "true" : "false"}
                  aria-describedby="slug-rules slug-error slug-status"
                  value={slugValue}
                  onChange={handleSlugChange}
                  onBlur={() => trigger("slug")}
                />
              </div>

              {/* Slug format rules */}
              <p
                id="slug-rules"
                className="text-xs text-muted-foreground"
              >
                3-50 characters. Lowercase letters, numbers, and hyphens only.
                Must start with a letter.
              </p>

              {/* Slug validation error */}
              {errors.slug && (
                <p id="slug-error" className="text-sm text-red-600" role="alert">
                  {errors.slug.message}
                </p>
              )}

              {/* Slug availability status */}
              <div id="slug-status">{renderSlugStatus()}</div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={isSubmitDisabled}
              isLoading={isSubmitting}
              loadingText="Creating..."
            >
              Create Workspace
            </Button>
          </form>

          {/* Have an invite link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an invitation?{" "}
              <Link
                href="/invite"
                className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary-500 rounded"
              >
                Have an invite? Join a workspace
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateWorkspaceForm;
