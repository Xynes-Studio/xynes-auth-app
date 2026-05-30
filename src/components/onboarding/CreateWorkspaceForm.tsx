"use client";

/**
 * CreateWorkspaceForm Component
 *
 * A form for creating a new workspace during onboarding.
 * Features auto-generation of slug from name, real-time slug validation,
 * and availability checking.
 *
 * BUG-AUTH-1 (2026-05-30): The redundant icon + subtitle block that lived
 * at the top of the card was removed — `<OnboardingScreen>` now owns the
 * page heading. All visible English strings have moved into the
 * `auth.onboarding.form.*` namespace (the slug-availability status strings
 * are still owned by `lib/workspace/validation.ts` and remain English-only
 * until a follow-up story migrates them).
 *
 * @module onboarding/CreateWorkspaceForm
 */

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Input,
  InputGroup,
  InputGroupInput,
  InputGroupPrefix,
  Spinner,
} from "@lumia-ui/components";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("auth.onboarding.form");
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
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const nameValue = watch("name");
  const slugValue = watch("slug");
  const slugField = register("slug");

  /**
   * Get access token for API calls
   */
  const getAccessToken = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

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
        const token = await getAccessToken();
        const response = await fetch(
          `${apiBaseUrl}/workspaces/check-slug/${slug}`,
          {
            method: "GET",
            headers: {
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            signal: slugCheckAbortController.current.signal,
          },
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
    [apiBaseUrl, getAccessToken],
  );

  // Debounced slug availability check
  const debouncedCheckSlug = useMemo(
    () =>
      debounce((slug: string) => {
        checkSlugAvailability(slug);
      }, 500),
    [checkSlugAvailability],
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
    [setValue],
  );

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
            setSubmitError(t("errors.conflict"));
            setSlugStatus("unavailable");
            return;
          }

          // Generic error message to prevent information leakage
          setSubmitError(t("errors.generic"));
          return;
        }

        const payload: unknown = await response.json();
        const workspace = ((
          payload as { data?: { data?: Workspace; slug?: string } }
        ).data?.data ??
          (payload as { data?: Workspace }).data ??
          payload) as Partial<Workspace>;

        // Defensive: gateway responses may be wrapped; always ensure we have a slug for redirects.
        const workspaceSlug = workspace.slug ?? data.slug;
        if (!workspaceSlug) {
          setSubmitError(t("errors.generic"));
          return;
        }

        const resolvedWorkspace: Workspace = {
          id: workspace.id ?? "",
          name: workspace.name ?? data.name.trim(),
          slug: workspaceSlug,
        };

        // Call success callback if provided
        onSuccess?.(resolvedWorkspace);

        // WSA-FIX-2 (2026-05-12): the default post-create destination is the
        // Auth Admin workspace dashboard, NOT the CMS console. The CMS console
        // is reached only when the caller explicitly forwards a `redirectUrl`
        // (e.g. CMS Console links to `/onboarding?redirect=<cms-landing>`).
        // `getSafeRedirectUrl` continues to validate against
        // `getAllowedRedirectDomains()` so an attacker-supplied redirect falls
        // back to the same Auth Admin target.
        const defaultTarget = "/dashboard/apps";

        const targetUrl = redirectUrl
          ? getSafeRedirectUrl(
              redirectUrl,
              defaultTarget,
              getAllowedRedirectDomains(),
            )
          : defaultTarget;

        // next/navigation router.push is intended for in-app navigation.
        // Use a hard navigation for absolute URLs (e.g., redirecting to the console app).
        if (/^https?:\/\//i.test(targetUrl) || targetUrl.startsWith("//")) {
          window.location.assign(targetUrl);
        } else {
          router.push(targetUrl);
        }
      } catch (error) {
        setSubmitError(t("errors.unexpected"));
        // Log the actual error to console for debugging, but don't show to user
        console.error("Failed to create workspace:", error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [apiBaseUrl, getAccessToken, onSuccess, redirectUrl, router, t],
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
    <div className="mx-auto w-full max-w-lg">
      <Card className="w-full border border-border/70 bg-card/95 shadow-xl">
        <CardContent className="px-6 pb-6 pt-6 sm:px-8">
          <div className="sr-only">
            {/*
              BUG-AUTH-1: The page H1 in <OnboardingScreen> already announces
              the screen. We keep a visually-hidden H2 here so screen readers
              still receive the form-section heading without the sighted UI
              duplicating "Create your workspace" twice. The wrapper carries
              no margin because the sr-only descendant is removed from the
              visual flow — a `mb-*` here would create a phantom gap at the
              top of the card.
            */}
            <h2>{t("heading")}</h2>
          </div>

          {submitError && (
            <Alert
              variant="error"
              title={t("errors.alertTitle")}
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
                {t("fields.name.label")}
              </label>
              <Input
                id="workspace-name"
                type="text"
                placeholder={t("fields.name.placeholder")}
                autoComplete="off"
                className="autofill:shadow-[inset_0_0_0px_1000px_hsl(var(--background))] autofill:text-foreground"
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "name-error" : undefined}
                invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p
                  id="name-error"
                  className="text-sm text-red-600"
                  role="alert"
                >
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
                {t("fields.slug.label")}
              </label>
              <InputGroup invalid={Boolean(errors.slug)}>
                <InputGroupPrefix className="bg-transparent text-muted-foreground">
                  {t("fields.slug.prefix")}
                </InputGroupPrefix>
                <InputGroupInput
                  id="workspace-slug"
                  type="text"
                  placeholder={t("fields.slug.placeholder")}
                  autoComplete="off"
                  spellCheck={false}
                  className="bg-transparent autofill:shadow-[inset_0_0_0px_1000px_hsl(var(--background))] autofill:text-foreground"
                  {...slugField}
                  aria-invalid={errors.slug ? "true" : "false"}
                  aria-describedby="slug-rules slug-error slug-status"
                  value={slugValue}
                  onChange={handleSlugChange}
                  onBlur={(e) => {
                    slugField.onBlur(e);
                    void trigger("slug");
                  }}
                />
              </InputGroup>

              {/* Slug format rules */}
              <p id="slug-rules" className="text-sm text-foreground/70">
                {t("fields.slug.rules")}
              </p>

              {/* Slug validation error */}
              {errors.slug && (
                <p
                  id="slug-error"
                  className="text-sm text-red-600"
                  role="alert"
                >
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
              size="md"
              disabled={isSubmitDisabled}
              isLoading={isSubmitting}
              loadingText={t("submitLoading")}
            >
              {t("submit")}
            </Button>

            {/* Disabled-state hint */}
            {isSubmitDisabled && !isSubmitting && (
              <div
                className={`text-xs ${
                  slugStatus === "unavailable" || errors.name || errors.slug
                    ? "text-red-600"
                    : slugStatus === "checking"
                      ? "text-muted-foreground"
                      : "text-muted-foreground"
                }`}
                role="status"
                aria-live="polite"
              >
                {slugStatus === "checking"
                  ? t("disabledHint.checking")
                  : slugStatus === "unavailable"
                    ? t("disabledHint.unavailable")
                    : t("disabledHint.fix")}
              </div>
            )}
          </form>

          {/* Have an invite link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {t("inviteFooter.prompt")}{" "}
              <Link
                href="/invite"
                className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                {t("inviteFooter.link")}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreateWorkspaceForm;
