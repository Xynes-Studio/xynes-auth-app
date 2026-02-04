"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

type InviteFormState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; inviteUrl: string }
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

export function CreateInviteForm({
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "",
}: CreateInviteFormProps) {
  const router = useRouter();
  const { getAccessToken } = useAuth();
  const { currentWorkspace, isLoading } = useWorkspace();

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
      setState({ status: "success", inviteUrl });
    } catch (error) {
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
  }, [accountsClient, canInvite, currentWorkspace, email]);

  const handleCopy = useCallback(async () => {
    if (state.status !== "success") return;

    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }, [state]);

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
            description="Invite created. Copy the link and share it with your teammate."
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
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy link"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    router.push(state.inviteUrl.replace(getInviteBaseUrl(), ""))
                  }
                >
                  Preview invite
                </Button>
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
