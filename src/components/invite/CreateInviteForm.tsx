"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { z } from "zod";
import { Alert, Button, Card, Input } from "@lumia-ui/components";
import { AccountsClient, useAuth, useWorkspace } from "@xynes/auth-sdk";

const inviteFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email"),
});

type ResendState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type InviteFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "success";
      inviteUrl: string;
      inviteId: string;
      email: string;
      expiresAt: string;
      emailAttempts: number;
      resend: ResendState;
    }
  | { status: "error"; message: string };

export interface CreateInviteFormProps {
  apiBaseUrl?: string;
}

function getInviteBaseUrl(): string {
  const configured = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (configured) return configured.replace(/\/$/, "");

  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "";
}

function buildInviteUrl(token: string): string {
  const base = getInviteBaseUrl();
  const path = `/invite/${encodeURIComponent(token)}`;
  return base ? `${base}${path}` : path;
}

/**
 * BUG-AUTH-8: extract the closed-set backend error code from the SDK's
 * thrown payload. The SDK throws either:
 *   (a) the parsed envelope `{ ok: false, error: { code, message }, meta }`
 *       (happy 4xx/5xx with a JSON body), or
 *   (b) `{ statusCode, message }` (network-level / parse-failure fallback).
 *
 * We read `(error as { error?: { code?: string } }).error?.code` defensively
 * and never trust the value beyond a closed-set comparison.
 */
function extractApiErrorCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const envelope = (error as { error?: unknown }).error;
  if (!envelope || typeof envelope !== "object") return null;
  const code = (envelope as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

/**
 * MAIL-6: format a backend ISO-8601 timestamp as a locale-aware date string
 * for the success-state body. Falls back to the raw input on `Invalid Date`
 * so a hostile / unparseable upstream value never throws inside render.
 *
 * Time is intentionally omitted — the success copy reads "until {expiresAt}
 * to accept", and the day-resolution is sufficient for an invitation
 * lifecycle. Operators with locale-specific time-sensitivity get the exact
 * timestamp from the resend handler's `emailSentAt` audit field anyway.
 */
function formatExpiresAt(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/**
 * MAIL-6: closed-set backend error code → i18n key suffix under
 * `auth.invite.resend.errors.*`. Unknown / hostile codes fall through to
 * `'generic'` — the upstream message string is NEVER consumed.
 *
 * Cross-references the closed set documented in
 * `xynes-accounts-service/src/actions/handlers/invites/resend.ts` (and the
 * gateway-level 403 for FORBIDDEN_ACTOR_KIND when an api_key actor reaches
 * the route despite the MVP preset gate).
 */
function resolveResendErrorKey(error: unknown): string {
  const code = extractApiErrorCode(error);
  switch (code) {
    case "RATE_LIMITED":
      return "rateLimited";
    case "INVALID_STATE":
      return "notPending";
    case "GONE":
      return "expired";
    case "NOT_FOUND":
      return "notFound";
    case "FORBIDDEN":
    case "FORBIDDEN_ACTOR_KIND":
      return "forbidden";
    default:
      // Fall through on statusCode-only failures (network / parse / 5xx).
      return "generic";
  }
}

export function CreateInviteForm({
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "",
}: CreateInviteFormProps) {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const { currentWorkspace, isLoading } = useWorkspace();
  // BUG-AUTH-8 + MAIL-6: localized copy for backend error codes AND the
  // MAIL-5 dispatch success / resend affordance. Other visible strings in
  // this form are still hard-coded English (a full next-intl migration of
  // the form's chrome is a separate follow-up story).
  const tCreateErrors = useTranslations("auth.invite.create.errors");
  const tCreateSuccess = useTranslations("auth.invite.create.success");
  const tResend = useTranslations("auth.invite.resend");
  const tResendErrors = useTranslations("auth.invite.resend.errors");
  const locale = useLocale();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [state, setState] = useState<InviteFormState>({ status: "idle" });
  const [copied, setCopied] = useState(false);

  const canInvite = currentWorkspace?.role === "workspace_owner";

  const accountsClient = useMemo(() => {
    if (!apiBaseUrl) return null;
    return new AccountsClient({
      baseUrl: apiBaseUrl,
      getAccessToken,
    });
  }, [apiBaseUrl, getAccessToken]);

  const helperText = useMemo(() => {
    if (isLoading) return "Loading workspace...";
    if (!currentWorkspace)
      return "Select a workspace first, then invite your teammate.";
    if (!canInvite) return "Only workspace owners can invite teammates.";
    return "We’ll create an invite link you can copy and share.";
  }, [isLoading, currentWorkspace, canInvite]);

  const handleSubmit = useCallback(async () => {
    if (!currentWorkspace) {
      setState({ status: "error", message: "Select a workspace to continue." });
      return;
    }

    if (!canInvite) {
      setState({
        status: "error",
        message: "Only workspace owners can invite teammates.",
      });
      return;
    }

    const parsed = inviteFormSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    if (!accountsClient) {
      setState({
        status: "error",
        message: "NEXT_PUBLIC_API_URL is required to send invites.",
      });
      return;
    }

    setCopied(false);
    setFieldError(null);
    setState({ status: "submitting" });

    try {
      const result = await accountsClient.createWorkspaceInvite(
        currentWorkspace.id,
        {
          email: parsed.data.email,
          roleKey: "workspace_member",
        },
      );

      const inviteUrl = buildInviteUrl(result.token);
      setState({
        status: "success",
        inviteUrl,
        inviteId: result.id,
        email: result.email,
        expiresAt: result.expiresAt,
        // MAIL-3: the row is created with `email_attempts = 0`; if MAIL-5's
        // initial dispatch succeeded it bumped to 1. We don't get that count
        // back from the create response today, so start at 1 (best-effort
        // floor) and let the resend handler return the canonical value.
        emailAttempts: 1,
        resend: { status: "idle" },
      });
    } catch (error) {
      // BUG-AUTH-8: branch on the backend's closed-set code FIRST. This catches
      // the two new guards regardless of HTTP status (both are 400) and falls
      // back to the legacy statusCode-based mapping for the historical 403/429
      // surfaces. The error message text itself is never echoed to the UI; we
      // only consume the structured code.
      const apiCode = extractApiErrorCode(error);
      if (apiCode === "SELF_INVITE") {
        setState({ status: "error", message: tCreateErrors("selfInvite") });
        return;
      }
      if (apiCode === "ALREADY_MEMBER") {
        setState({ status: "error", message: tCreateErrors("alreadyMember") });
        return;
      }
      if (apiCode === "FORBIDDEN") {
        setState({
          status: "error",
          message:
            "You don’t have permission to create invites for this workspace.",
        });
        return;
      }

      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 403) {
        setState({
          status: "error",
          message:
            "You don’t have permission to create invites for this workspace.",
        });
        return;
      }
      if (statusCode === 429) {
        setState({
          status: "error",
          message: "Too many requests. Please wait a moment and try again.",
        });
        return;
      }

      setState({
        status: "error",
        message: "Failed to create invite. Please try again.",
      });
    }
  }, [accountsClient, canInvite, currentWorkspace, email, tCreateErrors]);

  const handleCopy = useCallback(async () => {
    if (state.status !== "success") return;

    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [state]);

  /**
   * MAIL-6: re-dispatch the just-created invite. The accounts-service handler
   * rotates the token on every call (see `resend.ts` header), so this also
   * INVALIDATES the URL the form is currently displaying — that's reflected
   * in the success copy. The form does NOT update `state.inviteUrl` because
   * the rotated token never crosses the wire to the FE (security positive).
   */
  const handleResend = useCallback(async () => {
    if (state.status !== "success") return;
    if (!accountsClient || !currentWorkspace) return;

    const inviteId = state.inviteId;

    setState((prev) =>
      prev.status === "success"
        ? { ...prev, resend: { status: "submitting" } }
        : prev,
    );

    try {
      const result = await accountsClient.resendWorkspaceInvite(
        currentWorkspace.id,
        inviteId,
      );

      setState((prev) =>
        prev.status === "success"
          ? {
              ...prev,
              emailAttempts: result.emailAttempts,
              resend: {
                status: "success",
                message: tResend("success"),
              },
            }
          : prev,
      );
    } catch (error) {
      const key = resolveResendErrorKey(error);
      setState((prev) =>
        prev.status === "success"
          ? {
              ...prev,
              resend: {
                status: "error",
                message: tResendErrors(key),
              },
            }
          : prev,
      );
    }
  }, [accountsClient, currentWorkspace, state, tResend, tResendErrors]);

  const isSubmitting = state.status === "submitting";

  return (
    <Card className="w-full max-w-md border border-border/70 bg-card p-8 shadow-xl">
      <div className="space-y-6">
        {state.status === "error" ? (
          <Alert
            variant="error"
            role="alert"
            description={state.message}
            className="text-left"
          />
        ) : null}

        {state.status === "success" ? (
          <Alert
            variant="success"
            role="status"
            title={tCreateSuccess("title")}
            description={tCreateSuccess("body", {
              email: state.email,
              expiresAt: formatExpiresAt(state.expiresAt, locale),
            })}
            className="text-left"
          />
        ) : null}

        <div className="text-center">
          <h1 className="text-balance text-2xl font-semibold text-foreground">
            Invite a teammate
          </h1>
          <p className="mt-2 text-sm text-foreground/70 text-pretty">
            {currentWorkspace?.name
              ? `Workspace: ${currentWorkspace.name}`
              : "Send an invite to join your workspace."}
          </p>
        </div>

        <form
          className="space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="space-y-2">
            <label
              htmlFor="invite-email"
              className="block text-sm font-medium text-foreground"
            >
              Email
            </label>
            <Input
              id="invite-email"
              name="invite-email"
              placeholder="name@company.com"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              value={email}
              disabled={
                isLoading || !currentWorkspace || !canInvite || isSubmitting
              }
              aria-invalid={Boolean(fieldError)}
              aria-describedby={
                fieldError ? "invite-email-error" : "invite-help"
              }
              invalid={Boolean(fieldError)}
              onChange={(event) => {
                if (fieldError) setFieldError(null);
                setEmail(event.target.value);
              }}
            />
            {fieldError ? (
              <p
                id="invite-email-error"
                className="text-sm text-red-600"
                role="alert"
              >
                {fieldError}
              </p>
            ) : (
              <p id="invite-help" className="text-sm text-muted-foreground">
                {helperText}
              </p>
            )}
          </div>

          {state.status === "success" ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <label
                  htmlFor="invite-link"
                  className="block text-sm font-medium text-foreground"
                >
                  Invite link
                </label>
                <Input
                  id="invite-link"
                  value={state.inviteUrl}
                  readOnly
                  aria-readonly="true"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <p
                  id="invite-copy-secondary"
                  className="text-sm text-muted-foreground"
                >
                  {tCreateSuccess("copyLinkSecondary")}
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" onClick={handleCopy}>
                    {copied ? "Copied" : "Copy link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      router.push(
                        state.inviteUrl.replace(getInviteBaseUrl(), ""),
                      )
                    }
                  >
                    Preview invite
                  </Button>
                </div>
              </div>

              {/* MAIL-6: Resend affordance. Inline alert appears INSIDE the
                  resend block (not at the form top) so the success Alert at
                  top stays anchored to "invite created" and the resend
                  result is scoped to the action that produced it. */}
              <div className="space-y-2">
                {state.resend.status === "success" ? (
                  <Alert
                    variant="success"
                    role="status"
                    description={state.resend.message}
                    className="text-left"
                  />
                ) : null}
                {state.resend.status === "error" ? (
                  <Alert
                    variant="error"
                    role="alert"
                    description={state.resend.message}
                    className="text-left"
                  />
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  fullWidth
                  onClick={handleResend}
                  disabled={state.resend.status === "submitting"}
                  aria-describedby="invite-resend-hint"
                >
                  {state.resend.status === "submitting"
                    ? tResend("buttonSending")
                    : tResend("button")}
                </Button>
                <p
                  id="invite-resend-hint"
                  className="text-xs text-muted-foreground"
                >
                  {tResend("confirmHint")}
                </p>
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            fullWidth
            disabled={
              isLoading || !currentWorkspace || !canInvite || isSubmitting
            }
          >
            {isSubmitting ? "Sending..." : "Send invite"}
          </Button>
        </form>

        <div className="text-center">
          <Link
            href="/workspaces"
            className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            Back to workspaces
          </Link>
        </div>
      </div>
    </Card>
  );
}
