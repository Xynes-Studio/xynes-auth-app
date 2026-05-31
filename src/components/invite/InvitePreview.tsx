"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, useInvite } from "@xynes/auth-sdk";
import { useEffect, useCallback } from "react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Skeleton,
  Alert,
  Badge,
} from "@lumia-ui/components";
import Link from "next/link";

// Using basic SVG icons since lucide-react might not be available
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const UserPlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
    />
  </svg>
);

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
    />
  </svg>
);

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

interface InvitePreviewProps {
  token: string;
}

/**
 * BUG-AUTH-10 (2026-05-31): isolated copy for the wrong-account warning
 * surface. The surrounding component still ships raw English strings (not yet
 * on `next-intl`); this constant exists so the new BUG-AUTH-10 strings can be
 * migrated en bloc when the InvitePreview component moves onto the shared
 * `auth.invite` catalog. Keeping the wording in one place also means
 * translators can review the warning copy independently of the rest of the
 * card.
 *
 * Do NOT inline these strings at the JSX call sites — that defeats the
 * "isolated for migration" purpose. If you add another wrong-account string,
 * add it to this constant first.
 *
 * Security note (2026-05-31): the invited email is NEVER rendered in the
 * mismatch path. The invite token is an unauthenticated bearer credential
 * (the `/invite/<token>` resolve endpoint does not require auth so the
 * recipient can preview the invite before signing in). If a signed-in user
 * is NOT the intended recipient, exposing the invited email to them is an
 * information-disclosure leak: it lets the holder of a leaked / forwarded
 * invite link enumerate the recipient's address. The matched-email path is
 * unaffected because the signed-in user already owns that inbox.
 */
const INVITE_PREVIEW_COPY = {
  /** Body line shown above the Join button for the matched-email happy path. */
  signedInAs: "You are signed in as",
  /** Title of the wrong-account warning Alert (Lumia DS `variant="warning"`). */
  wrongAccountWarningTitle:
    "This invitation was sent to a different email address",
  /**
   * Body of the wrong-account warning Alert.
   *
   * SECURITY: the invited email is intentionally NOT included. The
   * currently-signed-in email IS included because the user already owns
   * that account (it is their own session, not a leak). The user can
   * check the email that delivered the invite link to confirm which
   * inbox was the intended recipient — we do not need to tell them.
   */
  wrongAccountWarningBody:
    "You are signed in as {signedInEmail}, but this invitation was sent to a different address. Open the email that contains the invite to see which account it was sent to, then sign in with that account to accept.",
  /** Label for the "Sign in with correct account" CTA that replaces Join when emails do not match. */
  wrongAccountCta: "Sign in with correct account",
  /** aria-label fragment for the wrong-account warning Alert region. */
  wrongAccountAriaLabel: "Invitation email mismatch warning",
} as const;

function unwrapInvitePayload(value: unknown): Record<string, unknown> | null {
  let current: unknown = value;
  while (
    current &&
    typeof current === "object" &&
    "data" in current &&
    (current as Record<string, unknown>).data !== undefined
  ) {
    current = (current as Record<string, unknown>).data;
  }

  if (!current || typeof current !== "object") {
    return null;
  }

  return current as Record<string, unknown>;
}

function getInviteRoleLabel(invite: Record<string, unknown>): string {
  const rawRole =
    typeof invite.role === "string"
      ? invite.role
      : typeof invite.roleKey === "string"
        ? invite.roleKey
        : "workspace_member";

  return rawRole.replace(/_/g, " ");
}

function getInviteExpiryLabel(expiresAt: unknown): string {
  if (typeof expiresAt !== "string" || expiresAt.trim().length === 0) {
    return "Expiration not provided";
  }

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    return "Expiration not provided";
  }

  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function InvitePreview({ token }: InvitePreviewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, redirectToLogin, user } = useAuth();
  const autoAccept = searchParams.get("autoAccept") === "true";

  // Validate environment variable
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_URL environment variable is required for InvitePreview component",
    );
  }

  const { invite, isLoading, error, acceptInvite, isAccepting } = useInvite(
    token,
    apiBaseUrl,
  );
  const inviteRecord = unwrapInvitePayload(invite);
  const inviteRoleLabel = inviteRecord
    ? getInviteRoleLabel(inviteRecord)
    : null;
  const inviteStatus =
    typeof inviteRecord?.status === "string" ? inviteRecord.status : null;
  const workspaceName =
    typeof inviteRecord?.workspaceName === "string" &&
    inviteRecord.workspaceName.trim().length > 0
      ? inviteRecord.workspaceName
      : "Workspace";
  const inviterName =
    typeof inviteRecord?.inviterName === "string" &&
    inviteRecord.inviterName.trim().length > 0
      ? inviteRecord.inviterName
      : "Workspace owner";
  const inviterEmail =
    typeof inviteRecord?.inviterEmail === "string"
      ? inviteRecord.inviterEmail.trim()
      : "";
  // BUG-AUTH-10: the raw invitee email is the address the invite was issued
  // for. It is used SOLELY for the local mismatch comparison below; it is
  // NEVER rendered in the wrong-account warning (see the security note on
  // `INVITE_PREVIEW_COPY` above). The `'your account'` fallback is preserved
  // ONLY for the display-only "You are signed in as ..." line when both the
  // invite payload omits inviteeEmail AND the auth context has not yet
  // hydrated; the mismatch comparison operates on the raw (un-fallback'd)
  // value so we never treat the fallback string as a real email address.
  const rawInviteeEmail =
    typeof inviteRecord?.inviteeEmail === "string"
      ? inviteRecord.inviteeEmail.trim()
      : "";
  const inviteeEmail =
    rawInviteeEmail.length > 0 ? rawInviteeEmail : "your account";
  const inviteExpiryLabel = getInviteExpiryLabel(inviteRecord?.expiresAt);

  // BUG-AUTH-10: render the currently-signed-in user's email on the
  // "You are signed in as" line, NOT the invitee email. Before BUG-AUTH-10
  // the line incorrectly mirrored `inviteeEmail`, which made the wrong
  // account look like the right one whenever the invite was issued for a
  // different address than the one currently signed in. We also compare
  // normalized lowercase + trimmed values so a casing/whitespace
  // difference does NOT falsely trigger the mismatch warning (the backend
  // already normalizes both sides the same way before rejecting; see
  // xynes-accounts-service/src/actions/handlers/invites/accept.ts).
  const signedInEmail =
    typeof user?.email === "string" && user.email.trim().length > 0
      ? user.email.trim()
      : null;
  const normalizedSignedInEmail = signedInEmail
    ? signedInEmail.toLowerCase()
    : null;
  const normalizedInviteeEmail =
    rawInviteeEmail.length > 0 ? rawInviteeEmail.toLowerCase() : null;
  // Mismatch is detected ONLY when both sides are known non-empty strings.
  // If either side is missing (signed-out user, backend omitted the
  // inviteeEmail field) we fall back to the existing behaviour rather
  // than block on incomplete data.
  const isEmailMismatch =
    isAuthenticated &&
    normalizedSignedInEmail !== null &&
    normalizedInviteeEmail !== null &&
    normalizedSignedInEmail !== normalizedInviteeEmail;

  // BUG-AUTH-10: distinct SDK error code surfaced when the backend
  // rejected the join because the user is signed in as the wrong
  // account. Used to upgrade the in-card error UI from the generic
  // destructive alert to actionable wrong-account copy (defense in depth
  // for the case where the user reached the Join button without the
  // pre-flight mismatch guard catching them — e.g. signed-in-as state
  // changed mid-flight).
  const isInviteEmailMismatchError = error?.code === "invite_email_mismatch";

  // Handle invite acceptance
  const handleAccept = useCallback(async () => {
    const result = await acceptInvite();
    if (!result) return;

    const workspaceSlug =
      typeof result === "object" &&
      result !== null &&
      "slug" in result &&
      typeof (result as { slug?: unknown }).slug === "string" &&
      (result as { slug: string }).slug.trim().length > 0
        ? (result as { slug: string }).slug
        : null;

    const consoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL || "";
    if (consoleUrl && workspaceSlug) {
      // Redirect to workspace dashboard in console app
      window.location.href = `${consoleUrl}/${workspaceSlug}`;
      return;
    }

    // Current accept API may return { accepted, workspaceId, roleKey } without slug.
    // In that case, route to the dashboard apps landing when no explicit redirect target exists.
    router.push("/dashboard/apps");
  }, [acceptInvite, router]);

  // BUG-AUTH-10 (PR #67 Codex P2 follow-up): the wrong-account CTA must
  // route through the server-side /logout route before bouncing the user
  // back to /login. Calling `redirectToLogin` directly while the user is
  // still authenticated triggers /login's authenticated-user redirect
  // effect (src/app/login/login.client.tsx), which immediately replays
  // the `redirect` param and sends the user back to /invite/<token> —
  // creating a redirect loop that only breaks once the loop-suppression
  // counter trips. The /logout route signs the user out of Supabase,
  // clears the httpOnly auth cookies, and 302s to /login?redirect=...
  // via `buildLogoutRedirectUrl`. That gives the user a clean /login
  // landing where they can sign in as a different account.
  //
  // SECURITY: `token` is the URL path parameter the component is already
  // rendering — no user-controlled redirect target is introduced here.
  // The /logout route's own redirect-domain allowlist still validates
  // the chained `redirect` against `getAllowedRedirectDomains`.
  const handleSignInAsCorrectAccount = useCallback(() => {
    const target = `/invite/${encodeURIComponent(token)}?autoAccept=true`;
    router.push(`/logout?redirect=${encodeURIComponent(target)}`);
  }, [router, token]);

  // Auto-accept effect
  useEffect(() => {
    // BUG-AUTH-10: skip auto-accept when the signed-in email does not
    // match the invitee email. The backend would reject the request
    // anyway (403 FORBIDDEN), and surfacing that as an error toast for
    // someone who simply clicked an invite link in the wrong tab is a
    // worse UX than showing them the warning Alert and the "Sign in
    // with correct account" CTA.
    if (
      isAuthenticated &&
      invite &&
      autoAccept &&
      !isAccepting &&
      !error &&
      !isLoading &&
      !isEmailMismatch
    ) {
      handleAccept();
    }
  }, [
    isAuthenticated,
    invite,
    autoAccept,
    isAccepting,
    error,
    isLoading,
    isEmailMismatch,
    handleAccept,
  ]);

  // Determine if we should show the error state card
  const isExpiredOrCancelled =
    inviteStatus === "expired" || inviteStatus === "cancelled";
  const isNotFound = error?.code === "invite_not_found";
  const isAlreadyMember = error?.code === "already_in_workspace";

  if (isExpiredOrCancelled || isNotFound || isAlreadyMember) {
    let title = "Invite Not Valid";
    let description = "This invitation is no longer valid.";
    let Icon = XCircleIcon;
    let iconClass = "text-red-600";
    let bgClass = "bg-red-100";
    let showSignIn = !isAuthenticated;

    if (isExpiredOrCancelled) {
      if (inviteStatus === "expired")
        description = "This invitation has expired.";
      else description = "This invitation has been cancelled.";
    } else if (isNotFound) {
      description = "The invitation code could not be found or has expired.";
    } else if (isAlreadyMember) {
      title = "Already a Member";
      description = "You are already a member of this workspace.";
      Icon = CheckCircleIcon;
      iconClass = "text-green-600";
      bgClass = "bg-green-100";
      showSignIn = false; // No need to sign in if already member (though error implies we tried to join)
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card
          className="w-full max-w-md"
          aria-labelledby="invite-error-title"
          role="alertdialog"
          aria-modal="true"
        >
          <CardHeader className="text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${bgClass}`}
              aria-hidden="true"
            >
              <Icon className={`h-8 w-8 ${iconClass}`} aria-hidden="true" />
            </div>
            <CardTitle id="invite-error-title" className="mt-4">
              {title}
            </CardTitle>
            <CardDescription id="invite-error-desc">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAlreadyMember ? (
              <p className="text-center text-sm text-muted-foreground">
                You can access this workspace from your dashboard.
              </p>
            ) : (
              <p
                className="text-center text-sm text-muted-foreground"
                id="contact-info"
              >
                Contact the workspace owner for a new invitation.
              </p>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() => router.push("/")}
              aria-describedby="invite-error-desc"
            >
              Go to Home
            </Button>
            {showSignIn && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => redirectToLogin(`/invite/${token}`)}
                aria-describedby="invite-error-desc"
              >
                Sign In
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card
        className="w-full max-w-md"
        aria-labelledby="invite-title"
        role="region"
        aria-label="Invite Preview"
      >
        <CardHeader className="text-center">
          <div
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100"
            aria-hidden="true"
          >
            <UserPlusIcon
              className="h-8 w-8 text-blue-600"
              aria-hidden="true"
            />
          </div>
          <CardTitle id="invite-title">Join Workspace</CardTitle>
          <CardDescription id="invite-description">
            You have been invited to join a workspace
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div
              className="space-y-4"
              data-testid="loading-state"
              role="status"
              aria-live="polite"
              aria-label="Loading invite information..."
            >
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full mt-6" />
            </div>
          ) : error ? (
            isInviteEmailMismatchError ? (
              // BUG-AUTH-10: when the SDK surfaces invite_email_mismatch
              // (e.g. the user reached Join before the pre-flight guard
              // because the signed-in state changed mid-flight), show
              // the actionable warning UI instead of the destructive
              // "error" alert. The CTA offers the user the path to
              // recovery (sign in with the correct account).
              //
              // SECURITY: we do NOT need to gate on
              // `rawInviteeEmail.length > 0` here. The previous version
              // gated this branch on the invitee email being known so
              // we could display it in the warning copy — that was
              // exactly the leak vector. The new copy never references
              // the invited email, so we render the warning whenever
              // the SDK tells us the backend rejected the join for
              // identity mismatch, regardless of whether the invite
              // resolve payload happened to include the address.
              <div className="space-y-4" data-testid="error-state">
                <Alert
                  variant="warning"
                  role="alert"
                  aria-live="assertive"
                  aria-label={INVITE_PREVIEW_COPY.wrongAccountAriaLabel}
                  title={INVITE_PREVIEW_COPY.wrongAccountWarningTitle}
                  description={INVITE_PREVIEW_COPY.wrongAccountWarningBody.replace(
                    "{signedInEmail}",
                    signedInEmail ?? "your current account",
                  )}
                />
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleSignInAsCorrectAccount}
                  data-testid="invite-wrong-account-cta"
                >
                  {INVITE_PREVIEW_COPY.wrongAccountCta}
                </Button>
              </div>
            ) : (
              <Alert
                variant="error"
                data-testid="error-state"
                role="alert"
                aria-live="assertive"
                description={error.message}
              >
                {/* Icon is auto-handled by Alert in lumia-ds */}
              </Alert>
            )
          ) : inviteRecord ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <BuildingIcon
                    className="h-5 w-5 text-gray-500"
                    aria-hidden="true"
                  />
                  <h2 className="text-xl font-semibold" id="workspace-name">
                    {workspaceName}
                  </h2>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="text-sm text-muted-foreground"
                    id="inviter-details"
                    aria-label={`Invited by ${inviterName}${inviterEmail ? ` (${inviterEmail})` : ""}`}
                  >
                    Invited by{" "}
                    <span className="font-medium">{inviterName}</span>
                    {inviterEmail ? ` (${inviterEmail})` : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant="subtle"
                    className="capitalize"
                    aria-label={`Role: ${inviteRoleLabel}`}
                  >
                    {inviteRoleLabel}
                  </Badge>
                </div>

                <div
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  id="expiry-info"
                >
                  <ClockIcon className="h-4 w-4" aria-hidden="true" />
                  <span>Expires: {inviteExpiryLabel}</span>
                </div>
              </div>

              {isAuthenticated ? (
                <div className="mt-6 space-y-2">
                  {isEmailMismatch && rawInviteeEmail.length > 0 ? (
                    // BUG-AUTH-10: pre-flight mismatch guard. Show a
                    // warning Alert (NOT destructive) explaining the
                    // mismatch, replace Join with "Sign in with correct
                    // account", and disable the Join action entirely so
                    // the user does not accidentally fire a request the
                    // backend will reject with 403.
                    //
                    // SECURITY: the invited email is intentionally NOT
                    // rendered. The currently-signed-in user is, by
                    // definition, NOT the intended recipient — showing
                    // them the invited address would leak it to a
                    // non-recipient. We gate this branch on
                    // `rawInviteeEmail.length > 0` only to ensure we
                    // have a real invite (and not the `'your account'`
                    // fallback) to compare against — we do not use the
                    // value in the rendered output.
                    <>
                      <Alert
                        variant="warning"
                        role="alert"
                        aria-live="polite"
                        aria-label={INVITE_PREVIEW_COPY.wrongAccountAriaLabel}
                        title={INVITE_PREVIEW_COPY.wrongAccountWarningTitle}
                        description={INVITE_PREVIEW_COPY.wrongAccountWarningBody.replace(
                          "{signedInEmail}",
                          signedInEmail ?? "your current account",
                        )}
                        data-testid="invite-wrong-account-warning"
                      />
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleSignInAsCorrectAccount}
                        aria-describedby="workspace-name inviter-details expiry-info"
                        data-testid="invite-wrong-account-cta"
                      >
                        {INVITE_PREVIEW_COPY.wrongAccountCta}
                      </Button>
                    </>
                  ) : (
                    <>
                      <p
                        className="text-center text-sm text-muted-foreground"
                        id="signed-in-as"
                        aria-live="polite"
                        data-testid="invite-signed-in-as"
                      >
                        {INVITE_PREVIEW_COPY.signedInAs}{" "}
                        <span className="font-medium">
                          {signedInEmail ?? inviteeEmail}
                        </span>
                      </p>

                      <Button
                        className="w-full"
                        onClick={handleAccept}
                        disabled={isAccepting || isLoading}
                        aria-describedby="workspace-name inviter-details expiry-info signed-in-as"
                      >
                        {isAccepting ? (
                          <>
                            <span className="sr-only">Loading</span>
                            <SpinnerIcon
                              className="mr-2 h-4 w-4 animate-spin"
                              aria-hidden="true"
                            />
                            Accepting...
                          </>
                        ) : (
                          <>
                            <span className="sr-only">Join</span>
                            <CheckCircleIcon
                              className="mr-2 h-4 w-4"
                              aria-hidden="true"
                            />
                            Join Workspace
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <p
                    className="text-center text-sm text-muted-foreground"
                    id="sign-in-prompt"
                  >
                    Sign in to accept this invitation
                  </p>

                  <Button
                    className="w-full"
                    onClick={() =>
                      redirectToLogin(`/invite/${token}?autoAccept=true`)
                    }
                    aria-describedby="workspace-name inviter-details expiry-info sign-in-prompt"
                  >
                    Sign In to Continue
                  </Button>

                  <p className="text-center text-xs text-muted-foreground pt-2">
                    {"Do not"} have an account?{" "}
                    <Link
                      href={`/signup?redirect=${encodeURIComponent(`/invite/${token}?autoAccept=true`)}`}
                      className="underline focus:outline-none focus:ring-2 focus:ring-primary focus:rounded"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p
                className="text-sm text-muted-foreground"
                role="alert"
                aria-live="assertive"
              >
                Invalid or expired invitation link
              </p>
            </div>
          )}
        </CardContent>

        {!isLoading && !error && inviteRecord && (
          <CardFooter className="flex justify-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:rounded"
              aria-label="Return to home page"
            >
              Back to Home
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
