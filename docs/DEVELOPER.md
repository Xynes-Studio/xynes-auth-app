# Developer Guide — xynes-auth-app

## Overview

This document captures the global engineering standards for the auth app, with emphasis on Next.js and React conventions, security, accessibility, and testing.

## Architecture (Global Standards)

### Next.js (App Router)
- Use App Router (`src/app`) with server components by default.
- Add `"use client"` only when required (hooks, browser APIs, client-only libs).
- Keep server/client boundaries explicit (no implicit browser usage in server components).
- Centralize cross-cutting providers in `src/app/providers.tsx`.

### React
- Prefer functional components + hooks.
- Keep UI components presentational; move logic into `src/lib/*` pure utilities.
- Avoid prop drilling for app-level concerns; use providers + hooks.

## OAuth (Local Dev Standard)

### Callback Strategy
- Auth flow must complete on the auth app origin (`NEXT_PUBLIC_AUTH_APP_URL`).
- OAuth redirect targets `/callback/client` for local implicit flow handling.
- Server route `/callback` remains for code-based exchanges when available.

### Redirect Persistence (Global Standard)
- Validate `redirect` against allowed domains or relative paths before storing.
- Persist validated redirects in `localStorage` under `xynes.auth.oauth_redirect`.
- Resolve redirect using query param first, then stored value, then safe default.
- Clear stored redirect after successful callback handling.
- For authenticated users with one or more workspaces, the safe default route is `/dashboard/apps`.
- During OAuth callback, persist default workspace selection under `xynes_workspace_id` using this priority:
	1. existing stored workspace when still accessible
	2. first accessible workspace from `/me`

### Callback Error UI (Global Standard)
- OAuth errors are rendered with safe, predefined messages (see `@/lib/oauth/errors`).
- Login page shows a consistent error banner when `?error=` is present.
- Callback client page shows error state with safe actions: retry login, go to login, and contact support.
- Never render provider-supplied `error_description` strings (prevents XSS).

### Supabase Local Setup
Required redirect URIs in Google Console:
- `http://localhost:54321/auth/v1/callback`
- `http://127.0.0.1:54321/auth/v1/callback`

Local Supabase allowlist (see `xynes-infra/supabase/config.toml`):
- `http://localhost:3100/callback`
- `http://localhost:3100/callback/client`
- `http://127.0.0.1:3100/callback`
- `http://127.0.0.1:3100/callback/client`

### Why Implicit Flow (Local Only)
- Avoids PKCE verifier storage errors during local OAuth testing.
- Tokens are parsed from URL hash and stored via `setSession` on the client.

## Provider Composition
Ensure `AuthProvider` and `WorkspaceProvider` wrap all routes that use `useAuth` or `useWorkspace`.

## Auth Routing Standards

These rules prevent login loops, open redirects, and confusing re-login prompts.

- `/login`
	- If a user is already authenticated, redirect immediately to the correct post-login destination (0 / 1 / many workspaces).
	- If a `redirect` query param exists, only honor it when it is validated/allowlisted; avoid loops back to `/login`.
	- Default post-login destination is:
		- `/onboarding` for users with 0 workspaces
		- `/dashboard/apps` for users with >=1 workspaces
- `/logout`
	- Must always return to the auth app `/login` (never default to CMS).
	- Any preserved `redirect` must be validated/allowlisted.
	- Server-side redirects require absolute URLs; compute the origin safely (prefer configured public auth URL; else allowlisted `x-forwarded-*`/`Host`).
- `/workspaces`
	- Only redirect externally when an explicit, validated `redirect` query param is present.
	- If no `redirect` is provided, selecting a workspace stays within the auth app and routes to `/dashboard/apps`.
	- Selection UI must prevent rage-clicking/multi-select races via an immediate local lock + visible loading state.

Feature-level details:
- `docs/features/logout-flow.md`
- `docs/features/auth-workspace-selector.md`

## Signup Verification + Profile Completion (BUG2)

### Route Contracts
- `/verify-email`
	- Primary email verification screen after signup.
	- Accepts `email` and optional validated `redirect` query params.
	- Supports OTP code entry and Supabase `token_hash` link fallback.
- `/complete-profile`
	- Mandatory gate for authenticated users whose `displayName` is missing/blank.
	- Accepts optional validated `redirect` query param.
	- Persists profile via `PATCH /me/profile` (gateway -> accounts-service).

### Global Redirect Priority
- After login/signup/callback bootstrap:
	1. If `displayName` is missing, force `/complete-profile` (with encoded redirect when safe).
	2. Else apply normal post-login destination rules (`redirect` param or safe default).
- Loop protection:
	- Never redirect authenticated users back to `/login`.
	- Never wrap `/complete-profile` into another `/complete-profile?redirect=...`.

### Global Client Gate
- `ProfileCompletionGate` is mounted in `src/app/providers.tsx`.
- It redirects authenticated users with missing `displayName` to `/complete-profile` from any non-exempt route.
- Exempt routes: login/signup/reset/forgot/verify-email/complete-profile/callback/logout.

### API Utilities
- `src/lib/profile/profile-api.ts`
	- `fetchMeBootstrap()` for `/me` envelope parsing.
	- `updateSelfProfile(displayName)` for `PATCH /me/profile`.
- API rules:
	- Require access token from Supabase session.
	- Validate and trim `displayName`.
	- Parse gateway envelope safely and fail closed on malformed payloads.
	- Never log OTP, access tokens, or raw sensitive payloads.

### Shared Auth Route Navigation (Global Standard)
- Reuse `AuthRouteSwitch` (`src/components/auth/navigation/AuthRouteSwitch.tsx`) across auth entry routes (`/login`, `/signup`) instead of duplicating link markup.
- Reuse `AuthSplitLayout` (`src/components/auth/layout/AuthSplitLayout.tsx`) as the common page scaffold for `/login` and `/signup`; only the form section content should vary by route.
- Keep route-state logic in a Tier 1 utility (`src/lib/auth/route-switch.ts`) to make routing behavior deterministic and unit-testable.
- Active route treatment must be route-aware and accessible:
	- set `aria-current="page"` on the active link
	- maintain sufficient light/dark contrast for active and inactive states
	- preserve keyboard focus visibility with `focus-visible` styles
- Auth layout visuals used by auth entry routes should live in shared auth components:
	- `src/components/auth/layout/PictureOfTheDay.tsx`
	- `src/components/auth/layout/XynesTicker.tsx`
- Hacker News ticker data-fetching logic must remain in Tier 1 utilities:
	- `src/lib/hacker-news/ticker-data.ts`
	- Keep component code (`XynesTicker`) focused on rendering and interaction only.
	- Use in-memory TTL caching + in-flight request deduplication to avoid repeated API calls when moving between auth routes that share `AuthSplitLayout`.

## Feature Flags

### Source of Truth
- Remote flags come from the gateway `/flags` endpoint via `FeatureFlagsProvider`.
- Flags are normalized to SDK keys (e.g., `enableOAuthGitHub` → `xynes_auth_oauth_github`).
- Apps dashboard rollout is gated behind `xynes_auth_dashboard_apps_v1` (disabled by default).

### Deterministic Overrides (Local)
Use env overrides to unblock QA and ensure deterministic UI:
- `NEXT_PUBLIC_ENABLE_OAUTH_GOOGLE`
- `NEXT_PUBLIC_ENABLE_OAUTH_GITHUB`
- `NEXT_PUBLIC_ENABLE_OAUTH_APPLE`
- `NEXT_PUBLIC_ENABLE_DASHBOARD_APPS_V1`
- `NEXT_PUBLIC_FEATURE_FLAGS_OVERRIDE` (JSON; gateway or SDK keys)

Overrides always win over remote values.

## Folder Structure Standards

```
src/
├── app/                # Next.js routes, layouts, providers
│   ├── <route>/components/  # Route-scoped UI (only used by that route)
├── components/         # React UI components (Tier 2)
│   ├── auth/
│   │   ├── forms/       # Auth forms (Login/Signup/Forgot/Reset)
│   │   │   ├── VerifyEmailForm.tsx
│   │   │   └── CompleteProfileForm.tsx
│   │   ├── guards/      # Auth flow guards (e.g., profile completion)
│   │   ├── navigation/  # Auth route navigation primitives
│   │   └── layout/      # Shared auth entry layout + visuals
├── lib/                # Pure utilities & SDK re-exports (Tier 1)
│   ├── auth/            # Post-login destination logic
│   ├── dashboard/       # Dashboard app catalog & CMS launch helpers
│   ├── profile/         # Profile/me bootstrap API utilities
│   ├── redirect/        # Safe redirect / allowlist helpers
│   └── workspace/       # Workspace schemas, validation, console URL builders
└── test/               # Shared test utilities
```

Rules:
- Tier 1 logic lives under `src/lib/*` and must be unit tested.
- Tier 2 components live under `src/components/*` with integration tests.
- Avoid mixing React components into `src/lib`.
- Route-specific UI that is not reused elsewhere should live under
	`src/app/<route>/components` to keep `src/components` focused on shared UI.

## Security Standards

- Never expose secrets in client code.
- Use safe redirect helpers and allowlists (see `@xynes/auth-sdk` redirect utils).
- Redirect primitive ownership:
	- `isValidRedirectUrl`, `getSafeRedirectUrl`, and `buildAuthRedirectUrl` contract must stay aligned with `@xynes/auth-sdk`.
	- `src/lib/redirect/index.ts` is intentionally server-safe because it is used by server routes (`/logout`); do not import SDK barrel exports there.
	- If SDK redirect behavior changes, mirror the same logic in `src/lib/redirect/index.ts` and update tests in the same PR.
- Do not log tokens or PII.
- Enforce feature flags defensively (UI + backend checks).

## Cross-App Workspace Navigation (Console URL Standard)

When navigating a user to the CMS console (e.g., after workspace creation or workspace switch), always use the canonical URL builder:

```tsx
import { buildCmsWorkspaceContentUrl, WORKSPACE_ADMIN_FALLBACK_PATH } from "@/lib/workspace";

// Full cross-app navigation
const url = buildCmsWorkspaceContentUrl({
  baseUrl: process.env.NEXT_PUBLIC_CONSOLE_URL,
  workspaceSlug: workspace.slug,
});

// Fallback when console URL is unset → "/dashboard/apps"
```

### Rules
- The canonical CMS workspace path is `/dashboard/{slug}/content`.
- Workspace slugs are validated against `^[a-z][a-z0-9-]{1,62}$` to prevent path traversal.
- Console base URLs are validated to reject `javascript:`, `//`, and non-HTTP schemes.
- When the CMS console URL env var is unset or the slug is invalid, navigation falls back to the workspace admin path (`/dashboard/apps`).
- Users with 0 workspaces are blocked from `/dashboard/*` and `/workspaces/*` redirects and routed to `/onboarding` instead. This is enforced in `determinePostLoginDestination`.

### Source files
- `src/lib/workspace/console-url.ts`: slug normalization, base URL validation, URL builder.
- `src/lib/workspace/console-url.test.ts`: unit tests (slug validation, URL injection attacks, fallbacks).
- `src/lib/auth/post-login-destination.ts`: workspace-gated redirect blocking.

## Accessibility Standards

- Use semantic HTML and accessible labels.
- Ensure error messages are announced (`aria-describedby`, `role="alert"` where appropriate).
- Keep keyboard navigation functional for all inputs and buttons.
- Error states must include actionable controls and be screen reader discoverable.

## Onboarding UX Standards

- Workspace creation UI must match global auth form styling (same input/button heights and spacing).
- Workspace URL input uses `InputGroup` with `xynes.com/` prefix and global input styles.
- Autofill styling must not alter input background; keep `bg-background` via autofill overrides.
- Copy uses ellipses (`…`) and `text-pretty` / `text-balance` for headings and helper text.

## Invite Entry UX Standards

- `/invite` is a lightweight entry page that accepts an invite link or code and routes to `/invite/<token>`.
- Keep the page server-rendered; place Lumia DS components behind a client shell when required.
- Validate and normalize invite input in a Tier 1 utility (`src/lib/invite/*`) before routing.
- Enforce token length between 16 and 128 characters; reject shorter/longer inputs.
- Use `encodeURIComponent` for tokens to prevent path injection.
- Provide accessible error messaging with `role="alert"` and `aria-describedby`.

### Invite Acceptance via OAuth Callback (BUG-AUTH-4, 2026-05-30)

- A logged-out invitee clicking the invite link → "Sign In to Continue" → "Login with Google" → returning to `/invite/<token>?autoAccept=true` triggers `InvitePreview`'s auto-accept effect (`isAuthenticated && invite && autoAccept`).
- The accept flow goes through `useInvite().acceptInvite()` (in `@xynes/auth-sdk`). On a fresh OAuth callback, Supabase's internal session-refresh logic can occasionally throw `Invalid Refresh Token: Refresh Token Not Found` DURING the accept POST, even though the backend join actually succeeds.
- The SDK now silently recovers from that case by re-listing workspaces and matching against `invite.workspaceId`. If the workspace is present, `acceptInvite()` returns it and `error` stays `null` — `InvitePreview` proceeds to the success redirect path (cross-app `consoleUrl/{slug}` or `/dashboard/apps`) instead of showing the generic "An unexpected error occurred" Alert.
- If the recovery check confirms the join did NOT happen, the SDK surfaces a `session_expired` error (NOT `unknown_error`) so the user sees actionable copy.
- Defense in depth: the SDK's `getAccessToken()` swallows Supabase `Invalid Refresh Token` failures and returns `null` rather than letting them bubble into every caller's try/catch. Downstream HTTP requests will fail with a clean 401 if auth is truly missing.
- Regression coverage: `src/app/invite/[token]/page.test.tsx` BUG-AUTH-4 block.

### Invite Identity Mismatch UX (BUG-AUTH-10, 2026-05-31)

- A signed-in user clicking an invite link that was issued for a **different** email address used to see two related bugs:
  1. The "You are signed in as ..." line in the invite-preview card displayed the **invitee email** from the invite payload, not the actual signed-in user's email. The line incorrectly mirrored `inviteRecord.inviteeEmail`, which made the wrong account look like the right one.
  2. Clicking Join fired the accept POST. The accounts-service correctly rejected the request with `403 FORBIDDEN { message: "Invite email does not match authenticated user" }`, but the SDK's `normalizeAuthError` fell through to the generic `unknown_error` code and the UI showed "An unexpected error occurred. Please try again." — actionable copy was lost.
- `InvitePreview.tsx` now reads `user` from `useAuth()` and:
  - Displays the **signed-in user's email** (`user.email`) on the "You are signed in as ..." line, with `inviteeEmail` retained only as a fallback for the rare case where the auth context has not yet hydrated.
  - Compares `user.email` against `inviteRecord.inviteeEmail` (both normalized via `.trim().toLowerCase()`, matching the backend's normalization in `xynes-accounts-service/src/actions/handlers/invites/accept.ts`).
  - Renders a Lumia DS `Alert variant="warning"` when they do not match, replaces Join with a "Sign in with correct account" CTA (calls `redirectToLogin(/invite/<token>?autoAccept=true)`), and gates the `autoAccept` effect so the backend never sees the request.
- **Security: do NOT render the invited email in the mismatch warning** (BUG-AUTH-10 follow-up, 2026-05-31). The invite token is an unauthenticated bearer credential — the `/invite/<token>` resolve endpoint does not require auth so the recipient can preview the invite before signing in. If a signed-in user is NOT the intended recipient (which is exactly the mismatch case), exposing the invited address to them would let the holder of a leaked / forwarded invite link enumerate the recipient's email. The warning copy therefore references only the **currently-signed-in user's own email** (which they own — no leak) and instructs them to open the email that delivered the invite to identify the intended recipient. Regression coverage: the BUG-AUTH-10 mismatch tests in `src/app/invite/[token]/page.test.tsx` explicitly assert that neither the full invited address nor its local-part appears anywhere in the rendered warning, on BOTH the pre-flight guard path and the SDK-error-code defense path.
- The SDK now exports a closed-set `invite_email_mismatch` error code (`@xynes/auth-sdk` `AuthErrorCode`). `useInvite().acceptInvite()` surfaces this code instead of `unknown_error` when the accounts-service returns the 403 mismatch shape. Defense in depth: the BUG-AUTH-4 refresh-token recovery path is intentionally skipped for this case — the backend has explicitly rejected the join, so recovery must not falsely "confirm" success.
- The card's destructive error Alert is upgraded to the wrong-account warning + CTA whenever `error.code === 'invite_email_mismatch'`, so a user who reached Join before the pre-flight guard caught them (mid-flight auth-state hydration) still sees the actionable surface.
- BUG-AUTH-10 strings live in an `INVITE_PREVIEW_COPY` constant at the top of `InvitePreview.tsx`. The surrounding component is not yet on `next-intl`; the constant exists so the new strings can be migrated en bloc when the file moves onto the shared `auth.invite` catalog.
- Regression coverage: `src/app/invite/[token]/page.test.tsx` BUG-AUTH-10 block (4 tests: match path, mismatch warning + no-leak, blocked auto-accept, SDK-error-code defense + no-leak). SDK-side coverage: `xynes-auth-sdk/src/utils/errors.test.ts` (`isInviteEmailMismatchError` describe) + `xynes-auth-sdk/src/hooks/useInvite.test.ts` (BUG-AUTH-10 describe).

### Post-Join Redirect Target (BUG-AUTH-11, 2026-05-31)

- After a successful invite accept, the user must land on the **CMS Console workspace dashboard** (`${NEXT_PUBLIC_CONSOLE_URL}/dashboard/<workspaceSlug>`), NOT the console root, NOT a non-existent `/<slug>` route, and NOT a placeholder `/workspace-url` route.
- Symptom reported as redirect-to-`/workspace-url`: the previous `handleAccept` callback in `InvitePreview.tsx` built `${consoleUrl}/${workspaceSlug}` and assigned it to `window.location.href`. The CMS Console renders its marketing scaffold at `/` and 404s on `/<slug>` (the workspace dashboard lives at `/dashboard/<workspaceSlug>` and then redirects to `/dashboard/<workspaceSlug>/content` via `WorkspaceDashboardPage`). The end result was a broken landing page — exactly the "ghost route" symptom the bug report described.
- `InvitePreview.tsx` now:
  - Builds `${normalizedConsoleUrl}/dashboard/${encodeURIComponent(workspaceSlug)}` when both `NEXT_PUBLIC_CONSOLE_URL` and the accept payload's `workspace.slug` are present.
  - Strips a single trailing slash from `NEXT_PUBLIC_CONSOLE_URL` (e.g. `https://cms.xynes.com/` → `https://cms.xynes.com`) so the final URL never contains a `//` segment.
  - URI-encodes the slug as defense in depth — workspace slugs are backend-validated to a safe charset, but encoding guards against an upstream regression that ever loosened the constraint.
  - Falls back to `router.push("/dashboard/apps")` (the Auth Admin landing, matching BUG-AUTH-2's canonical post-create redirect pattern) when the console URL is unset, or when the accept payload omits a slug (legacy `{ accepted, workspaceId, roleKey }` response shape).
- Regression coverage: `src/app/invite/[token]/page.test.tsx` BUG-AUTH-11 describe block (6 tests: canonical redirect with `/dashboard/` prefix; never-produces-`/<slug>`-root + never-`/workspace-url` regression guard; trailing-slash normalization; URI-encoded slug + raw-slug-absent invariant; fallback to `/dashboard/apps` when console URL unset; fallback to `/dashboard/apps` when accept payload omits slug).

## Dashboard UX Standards

- Dashboard routes live under `src/app/dashboard/*` and should compose `AuthDashboardShell` for layout consistency.
- `AuthDashboardShell` must wrap Lumia DS `DashboardShell` from `@lumia-ui/layout` (avoid custom shell re-implementations).
- Workspace switching inside the dashboard must **not** navigate away from the auth app.
- Use dashboard shell workspace callbacks and keep routing inside auth-app by default.
- Only redirect to the console when explicitly required by flow and explicitly validated.
- Post-login for existing users should remain in auth app (`/dashboard/apps`) unless a validated explicit redirect is provided.
- When a dashboard section is not implemented, render a single `UnderDevelopmentPanel` for the full right/main section and avoid partial placeholder widgets.
- Icon policy: if using Lumia icon ids that rely on sprite-backed icons (`check`, `add`, `edit`, `delete`, `info`, `alert`, `search`, `chevron-*`), `IconSprite` must be mounted once in app providers (`src/app/providers.tsx`).
- Keep dashboard route-specific UI in `src/app/dashboard/<route>/components`; keep shared shell/navigation pieces in `src/components/dashboard`.

### Apps Dashboard V1 (Template Standard)

- Primary dashboard route for existing users is `/dashboard/apps` (hard switch from `/dashboard/users`).
- Route implementation:
	- `src/app/dashboard/apps/page.tsx`
	- Feature flag gate: `xynes_auth_dashboard_apps_v1`
- Shared reusable collection template (for future dashboard entity pages):
	- `src/components/dashboard/entity-collection/EntityCollectionTemplate.tsx`
	- `src/components/dashboard/entity-collection/DashboardNoResults.tsx`
	- `src/components/dashboard/entity-collection/useDebouncedValue.ts`
	- `src/components/dashboard/entity-collection/types.ts`
- Route-specific composition remains in route scope:
	- `src/app/dashboard/apps/components/AppsDashboardContent.tsx`
	- `src/app/dashboard/apps/components/apps-static-data.ts`
- Pure Tier 1 app-catalog logic must stay in:
	- `src/lib/dashboard/apps/apps-catalog.ts`

Apps V1 behavior contract:
- Tabs: `Installed`, `Marketplace`.
- Installed uses static catalog in this version.
- Marketplace renders under-development state.
- Search is debounced (300ms) and supports immediate submit button.
- View mode uses Lumia `ViewToggle` (`grid`/`list`).
- Tiles use Lumia `AppTile` / `EntityTile`.
- Select-all and sort controls are disabled when result count <= 1.
- No-results uses shared `DashboardNoResults`.

Apps V1 security contract:
- App launch URL must be constructed via `buildCmsLaunchUrl` only.
- CMS launch URLs must target the dashboard namespace (`/dashboard/:workspaceSlug`), not legacy flat workspace paths.
- Workspace slug must be validated/sanitized before URL composition.
- New-tab launches must use `noopener,noreferrer`.

Apps V1 maintainability contract (Next.js + React):
- Keep CMS URL composition centralized in `src/lib/dashboard/apps/apps-catalog.ts` (no inline CMS URL strings in components).
- Route/components should consume helpers; helper behavior changes must be validated with Tier 1 tests before UI tests.
- Any future CMS route-contract change must update both:
  - helper tests (`src/lib/dashboard/apps/apps-catalog.test.ts`)
  - consuming integration tests (`src/app/dashboard/apps/components/AppsDashboardContent.test.tsx`)

Apps V1 theming contract:
- Do not use hardcoded light-only dashboard surface colors.
- Use design tokens (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) for light/dark consistency.

Apps V1 validation commands:
- `pnpm lint`
- `pnpm test src/lib/dashboard/apps/apps-catalog.test.ts src/app/dashboard/apps/page.test.tsx src/app/dashboard/apps/components/AppsDashboardContent.test.tsx`
- `pnpm test src/components/dashboard/entity-collection/EntityCollectionTemplate.test.tsx src/app/dashboard/components/UnderDevelopmentPanel.test.tsx`

### Directory Dashboard V1 (Directory Tab Story)

- Route implementation:
	- `src/app/dashboard/directory/page.tsx`
	- `src/app/dashboard/directory/components/DirectoryDashboardContent.tsx`
- Tier 1 directory data utilities:
	- `src/lib/dashboard/directory/members-api.ts`
	- `src/lib/dashboard/directory/members-transform.ts`

Directory V1 behavior contract:
- Tabs: `Users`, `Teams`, `Invites`.
- `Users` loads workspace members from gateway `GET /workspaces/:workspaceId/members`.
- `Teams` and `Invites` render under-development panels (enabled tabs, non-functional content).
- Search is debounced (300ms) and supports immediate submit button.
- Invite CTA routes to `/workspaces/invites/new`.
- On mobile, invite CTA is icon-only; on desktop, label + icon.
- Tiles use Lumia `UserTile`/`EntityTile` patterns.

Directory V1 security contract:
- Members endpoint URL must use `encodeURIComponent(workspaceId)`.
- Members API must require bearer token from `useAuth().getAccessToken()`.
- Do not render raw backend error details to users; map to safe, user-facing messages.
- Do not log auth token or member PII in client-side logs.

Directory V1 component API extension contract:
- `EntityCollectionTemplate` supports optional `searchLeadingAction` for route-specific CTAs.
- `EntityCollectionTemplate` supports optional aria label overrides:
	- `searchAriaLabel`
	- `selectAllAriaLabel`
	- `sortAriaLabel`
- Changes must remain backward-compatible for existing dashboard pages.

Directory V1 validation commands:
- `pnpm lint`
- `pnpm test src/lib/dashboard/directory/members-transform.test.ts src/lib/dashboard/directory/members-api.test.ts`
- `pnpm test src/app/dashboard/directory/page.test.tsx src/app/dashboard/directory/components/DirectoryDashboardContent.test.tsx`
- `pnpm test src/components/dashboard/entity-collection/EntityCollectionTemplate.test.tsx`

## Picture of the Day (Login Experience)

- Server route: `src/app/api/picture-of-the-day/route.ts`.
- Server-only env var: `PEXELS_API_KEY` (never use `NEXT_PUBLIC_*`).
- Always validate external URLs before returning payloads.
- Use `src/lib/picture-of-the-day` for shared validation and fallback content
	(Tier 1 unit tests required).
- Client UI lives in `src/components/auth/layout/PictureOfTheDay.tsx` and is consumed by the shared auth entry layout.
- Client cache lives in `src/components/auth/hooks/usePictureOfTheDay.ts` and stores validated payloads in `localStorage` using a TTL for faster repeat visits.
- Client rendering should not rely on `FALLBACK_PICTURE_OF_THE_DAY`; fallback remains server-side only.

## Hacker News Ticker (Auth Layout)

- Shared auth routes (`/login`, `/signup`, `/forgot-password`) mount the same ticker visual via `AuthSplitLayout`.
- To prevent redundant calls on route transitions, ticker data must be fetched through `src/lib/hacker-news/ticker-data.ts`.
- Cache policy:
	- TTL: 5 minutes
	- Reuse cached stories across remounts
	- Deduplicate concurrent fetches through a shared in-flight promise

## Testing Standards (ADR-001)

- Follow the three-tier testing architecture (Tier 1 = 100%, Tier 2 = 70%, Tier 3 = smoke).
- Overall coverage target: **80%** minimum.
- See [docs/TESTING.md](TESTING.md).

### TDD Requirements
- Write or update tests before implementation changes.
- Tier 1 utilities: 100% coverage target.
- Tier 2 components/hooks: 70% coverage target.
- Do not merge below 80% overall coverage.

## Quality Gates (Release Gates)

Run all of the following before raising a PR or handing off:

- `pnpm lint` — ESLint over source.
- `pnpm typecheck` — `tsc --noEmit` across the project. Catches type drift that `next lint` does not enforce. **Release gate** (CI runs it on every PR).
- `pnpm test` — full Vitest suite.
- `pnpm test:coverage` — coverage threshold gate (>= 80% lines / branches overall).
- `pnpm build` — production Next.js build. Catches runtime-only errors (`<Html>` outside `_document`, missing exported members from linked workspaces) that `tsc --noEmit` cannot.

If `pnpm typecheck` reveals errors in linked-workspace consumers (`@lumia-ui/components`, `@lumia-ui/forms`, `@xynes/auth-sdk`), coordinate with the owning repo. Do NOT silence the type errors with broad `as any` casts; either fix the downstream export or narrow the consumer with a targeted, commented cast.

> **Forbidden: ambient `declare module` shims for linked-workspace types.** Adding a top-level `declare module "@lumia-ui/components"` (or any other linked workspace) inside `src/types/*.d.ts` masks every prop type in the package, so real prop-shape regressions silently pass `tsc --noEmit`. PFU-5a removed exactly such a shim and surfaced a `MenuItem`-without-`label` regression that had been hidden for weeks. If a built `dist/index.d.ts` is missing a symbol, fix the export upstream (Lumia DS) and rebuild — never paper over it with an ambient declaration.

## Workspace Admin Integrations (Source-of-Truth Surface)

This app is the **Workspace Admin** for the Xynes platform. The Integrations dashboard at `/dashboard/integrations` owns the lifecycle of:

- **Verified domains** (`platform.workspace_domains`) — register, DNS-TXT verify, delete (soft).
- **Workspace API keys** (`platform.workspace_api_keys`) — create with preset scopes, revoke, view usage.

Other apps (CMS console, future consumers) link **into** this surface as contextual consumers — they MUST NOT host their own domain or API key lifecycle forms.

### Layout — in-content tabs (redesign, 2026-06-01)

The page is organised as **in-content underline tabs** rather than two stacked cards, so the surface scales as new sections are added:

- Tabs: **Domains** (count badge) · **API Keys** (count badge) · **Webhooks** (disabled placeholder for the next section).
- Tabs use the Lumia `Tabs` family with `variant="underline"` and the per-trigger `count` badge (added to `@lumia-ui/components` in `packages/components/src/tabs/tabs.tsx`). The default `Tabs` variant stays `segmented`; underline is opt-in. **Local Lumia changes require a `pnpm --filter @lumia-ui/components build` before the linked app picks them up.**
- The selected tab is controlled state (`activeTab`) initialised from the `?tab=` deep link; each panel is a `role="region"` labelled by its section heading (the `tabIndex={-1}` heading is still focused on deep-link for SR/keyboard users).
- A `briefcase` active-workspace chip (Lumia `Badge variant="outline"`) sits under the page title.
- All user-facing copy added/relocated by the redesign is in the `auth.integrations` next-intl catalog (`tabs.*`, `domains.heading/description`, `apiKeys.heading/description`, `common.copy/copied`), mirrored in the `en-XA` pseudo-locale, with translator notes in `auth.integrations.meta.json`. Pre-existing panel copy (form labels, DNS provider notes, confirm-dialog text) is **not yet migrated** — tracked as a follow-up.

### Components

- `src/lib/integrations/workspace-integrations-client.ts` — typed gateway client (Task 1, landed 2026-05-05). Exposes `listWorkspaceDomains`, `registerWorkspaceDomain`, `verifyWorkspaceDomain`, `deleteWorkspaceDomain`, `listWorkspaceApiKeys`, `createWorkspaceApiKey`, `revokeWorkspaceApiKey`, and `WorkspaceIntegrationsApiError`. All payloads are normalised through allowlists so server-side secrets (`keyHash`, `verificationValueHash`, `internalAuditNote`, `rawKey` outside the create flow) cannot leak into UI state.
- `src/lib/integrations/workspace-integrations-types.ts` — shared types + `WORKSPACE_API_KEY_PRESET_KEYS` (`cms_readonly`, `cms_authoring`, `cms_publisher`, `telemetry_read`, `workspace_admin`). Cross-package contract mirror of `@xynes/platform-contracts` `WORKSPACE_API_KEY_PRESET_KEYS` (PFU-6, landed 2026-05-09); parity is enforced by `workspace-integrations-types.contract.test.ts`. The accounts-service preset → action-key scope mapping (`WORKSPACE_API_KEY_PRESETS`) is server-only authz wiring and intentionally not part of the cross-package contract.
- `src/app/dashboard/integrations/page.tsx` — thin client page wired through `AuthGuard` + `AuthDashboardShell` with `activeNav="integrations"`.
- `src/app/dashboard/integrations/components/WorkspaceIntegrationsDashboard.tsx` — container (Task 2, landed 2026-05-05). Owns data fetching for both lists, surfaces active workspace context, and renders accessible loading / error / empty / no-workspace states. Per-row rendering and lifecycle actions live in `DomainManagementPanel` (Task 3) and `ApiKeyManagementPanel` (Task 4).
- `src/app/dashboard/integrations/components/DomainManagementPanel.tsx` — verified-domain lifecycle UI (Task 3, landed 2026-05-05). Renders the domain list, registration form, DNS-TXT verification action, and soft-delete confirmation with Lumia DS primitives. It keeps the one-time `verificationValue` local to the panel reveal state, never renders hash/internal audit fields, preserves typed input on failed registration, and exposes loading/error/empty/permission states through accessible status regions and labels.
- `src/app/dashboard/integrations/components/CopyButton.tsx` — small copy-to-clipboard affordance (redesign, 2026-06-01) wrapping the Lumia `Button` (`variant="outline"`, `size="sm"`) with a `copy`→`check` icon and a transient "Copied" label. Clipboard write is best-effort; visible labels are passed in (i18n-ready). Used by the DNS record cells and the one-time secret reveals.
- `src/app/dashboard/integrations/components/ApiKeyManagementPanel.tsx` — workspace API key lifecycle UI (Task 4, landed 2026-05-08). Renders the API key list (name, prefix, status pill, preset label, last used, expiry), the create-key form (Name input + Preset `Select`), and the revoke confirmation flow with Lumia DS primitives. The one-time raw key (`xynes_live_<hex>`) is held in container state ONLY (`pendingRawApiKey`) and forwarded to the panel via prop; the panel renders it exactly once inside an `InlineAlert` (`role="status"`, `aria-live="polite"`) with the warning copy "You won't see this key again", a single "Dismiss API key" button, and never copies it into any other state. Status pill mapping uses Lumia's `success | warning | error | info` variants only (`active`→success, `expired`→warning, `revoked`→error). Revoked and expired keys correctly do NOT render a Revoke button. The destructive Revoke action is gated by Lumia `ConfirmDialog` (a real focus-trapped `alertdialog`). Preset labels follow `WORKSPACE_API_KEY_PRESET_KEYS` (`CMS Read-only`, `CMS Authoring`, `CMS Publisher`, `Telemetry Read`, `Workspace Admin`).

### Deep-link contract (Task 5, landed 2026-05-08)

The `/dashboard/integrations` page honors deep-link query parameters from CMS console links built by `xynes-front-end/xynes-cms-console-web/src/features/integrations/workspace-admin-links.ts`:

- `?tab=domains` — selects the Domains tab and moves keyboard focus to the "Verified domains" heading on first load so screen-reader and keyboard users land on the relevant section without scrolling. The heading carries `tabIndex={-1}` so it is programmatically focusable but not part of the natural tab order.
- `?tab=api-keys` — selects the API Keys tab and applies the same focus contract for the "Workspace API keys" heading.
- `?preset=cms_readonly` or `?preset=cms_publisher` — pre-selects the matching option in the create-API-key form's Preset `Select`. Only the values in the local allowlist (validated against `WORKSPACE_API_KEY_PRESET_KEYS`) are honored; unknown / hostile values are silently ignored and the default `cms_readonly` is preserved.

Both parameters can be combined: CMS uses targets `cms_readonly_key` (`?tab=api-keys&preset=cms_readonly`) and `cms_publisher_key` (`?tab=api-keys&preset=cms_publisher`).

The container uses `useSearchParams()` (from `next/navigation`), so `page.tsx` wraps the container in a `<Suspense>` boundary with a `Spinner` fallback — required by Next.js 15 for client-side search-params reads during static prerender.

### Permission-aware empty state on load 403 (BUG-AUTH-6, landed 2026-05-31)

Pre-BUG-AUTH-6, a 403 from `listWorkspaceDomains` or `listWorkspaceApiKeys` on initial mount rendered the same destructive `Alert` (`title="Couldn’t load integrations"`) as a 5xx failure, with the body copy "You don’t have permission to manage workspace integrations." This wrongly framed a deliberate permission boundary — a `workspace_member` opening an owner-only surface — as a load failure. Members had to puzzle out whether the page was broken or whether they were lacking access.

After BUG-AUTH-6, the load surface returns a **discriminated outcome**:

- **HTTP 403** → `loadOutcome = { kind: "forbidden" }`. The container short-circuits the normal render path and emits a neutral `Card` with `data-testid="workspace-integrations-forbidden-empty-state"` containing the heading "Workspace integrations are managed by owners", a single explanatory paragraph, and a "Back to dashboard" link to `/dashboard/apps`. No `Alert` (no `role="alert"`), no destructive variant, no "couldn’t load" copy. The active workspace slug is preserved on the header so the member can still see context.
- **HTTP 401 / 429 / 5xx / network / malformed** → `loadOutcome = { kind: "error"; messageKey }`. The pre-existing destructive `Alert` ("Couldn’t load integrations" + Retry button) still fires, with the body copy resolved from the new `auth.integrations.loadError.*` catalog branch.

The classification lives in a single `classifyLoadOutcome(error)` helper at the top of `WorkspaceIntegrationsDashboard.tsx`. 401 stays on the load-error path because session expiry IS a recoverable failure — the user can sign in again; permission ownership is not changed by re-auth. The forbidden empty state does NOT render the domain or API-key management panels (no add-domain form, no create-key form, no list counts) — there is nothing for a member to interact with at the owner-only lifecycle surface, and rendering an empty list with a hidden "Add" button would be a misleading affordance.

Behavioural invariants preserved byte-for-byte:

- **Per-action 403** (e.g. a member somehow firing the add-domain mutation through a stale UI) STILL surfaces through the existing `actionError` channel with copy "You don’t have permission to manage workspace integrations." — that text is owned by `getIntegrationsActionErrorMessage`, NOT by the load-error path. The per-action surface is a different concern.
- **`reloadFailedAfterAction` soft banner** still fires after a successful action whose follow-up refresh failed (WSA-FIX-1 contract).
- **Cross-workspace leakage guard** still clears the `pendingVerificationValue` and `pendingRawApiKey` reveal slots on workspace switch.
- **Deep-link query params** (`?tab=…&preset=…`, Task 5) still apply on owner / super-admin loads. Members never reach the panels, so focus-on-heading is a no-op for them.

Visible copy migrated to a new `auth.integrations` i18n namespace (catalog + translator-meta sidecar at `messages/en-US/auth.integrations.{json,meta.json}`; pseudo-locale regenerated via `pnpm generate:pseudo`). The namespace is registered in `src/i18n/config.ts` and the global next-intl test mock in `src/test/setup.ts`. Keys are semantic (`page.title`, `loadError.title`, `forbiddenEmptyState.title`, etc.) — translators get a sidecar that explicitly forbids words like "forbidden", "denied", or "unauthorised" in the empty-state copy because the page is still reachable.

Regression coverage: 7 tests in `WorkspaceIntegrationsDashboard.test.tsx` under `describe("BUG-AUTH-6 — permission-aware empty state on 403 load", …)` — neutral region renders with documented testid; no `role="alert"` anywhere on the page; domain + API-key panels are absent; workspace slug context preserved; 401 stays on the destructive path; **429 still resolves to the "Too many requests" copy** (regression guard caught during pre-PR re-validation that the refactor accidentally mapped 404 instead of 429 to the rate-limited message key); hostile upstream error message text (e.g. an embedded `xynes_live_<hex>` token or `apiKeyId=…` UUID) does NOT survive into the visible markup. The previous single test "renders a permission-denied error message for 403 responses" was deleted — its assertion was the symptom this story fixes.

### Domain verification UX hardening (Phases A–D, landed 2026-05-08)

The verified-domain lifecycle gained four coordinated UX improvements. Each phase ships across multiple repos; the auth-app side documented here is wired through `DomainManagementPanel` and `WorkspaceIntegrationsDashboard`.

**TXT-only verification — kept as-is.** The MVP verifies domain ownership via a single DNS TXT record at `_xynes.<hostname>`. This matches the industry standard (Google Search Console, AWS ACM, Vercel, Cloudflare, Stripe Connect, GitHub Pages) and the CHECK enum on `platform.workspace_domains.verification_method` keeps the column extensible without schema churn. No HTTP file challenge or CAA path in the MVP.

**Phase A — "Get new value" recovery.** Workspace owners who lose the original one-time DNS TXT reveal can click the per-row **Get new value** button on a pending or failed domain. The container calls `regenerateWorkspaceDomainVerification()` (gateway route `POST /workspaces/:workspaceId/domains/:domainId/regenerate-verification`, accounts-service action `platform.domains.regenerateVerification`, separate authz catalog entry with the SAME effective grants as `platform.domains.create`). On success the new raw `xynes-verify-<64-hex>` value lands in the same one-time reveal slot the register flow uses. The button is hidden on `verified` rows because regenerating a verified domain would silently revoke verification (backend returns 409 CONFLICT in that case anyway).

**Phase B + D — structured verify diagnostics.** The verify handler now categorizes failures into a stable union (`NXDOMAIN | TIMEOUT | DNS_ERROR | NO_RECORDS | MISMATCH`) and surfaces a count-only `dnsRecordsFound` (NEVER raw record values — those could be attacker-supplied content from a hostile DNS zone). The panel renders a 3-step diagnostic strip on failed and verified rows:

```text
DNS lookup:    ✓ Resolved        (✗ on NXDOMAIN / TIMEOUT / DNS_ERROR)
TXT records:   ✓ N found         (✗ when 0 → NO_RECORDS; · skipped when DNS errored)
Value match:   ✓ Matched         (✗ on MISMATCH; · skipped until both prior steps pass)
```

Every step renders a per-status `data-status="pass|fail|skipped"` attribute and an `sr-only` status label so screen-reader users hear the same conversation as sighted users. The strip is tested per failure category in `DomainManagementPanel.test.tsx`.

**Phase C — status-aware destructive copy.** The backend `platform.domains.delete` is a soft-delete (status flip to `disabled`) regardless of prior status, so the FE drives copy off the row's current status:

| Row status | Button label   | Dialog title                       | Confirm label         |
|------------|----------------|------------------------------------|-----------------------|
| pending    | Cancel         | Cancel domain verification?        | Cancel verification   |
| failed     | Remove         | Remove failed domain?              | Remove                |
| verified   | Disable        | Disable domain?                    | Disable               |

A pending row never says "will stop accepting traffic" because it never accepted any traffic. Same gateway route, same authz check, same audit trail.

**Phase D — recopy via clipboard.** While a fresh reveal is active (`pendingVerificationValue !== null`), the reveal block renders an additional "Copy verification value" button that calls `navigator.clipboard.writeText()` with the raw value. The Copy button is gated on a non-null reveal slot so it can never lie about what the user actually has — once the slot is dismissed (or the workspace changes), the button unmounts.

### Domain verification reveal — structured DNS instructions + auto-recheck (WSA-FIX-3, landed 2026-05-12)

DNS provider UIs (Cloudflare, AWS Route 53, Namecheap, GoDaddy) ask for **two fields** when adding a TXT record — a **Name** (also called "Host" or "Hostname") and a **Value** (also called "TXT data") — but the original reveal block only surfaced the raw value inside a single `<code>` block, with the FQDN buried in a separate sentence below. Users routinely pasted the value into the wrong field, or set the record at the apex instead of at `_xynes.<hostname>`. The "I've added it" button was also a no-op dismiss — there was no way to re-verify without finding the smaller per-row "Recheck" link, which became inaccessible the moment the user clicked "I've added it" and the reveal collapsed.

**Structured reveal table.** The reveal now renders a `<dl>` (`data-testid="domain-verification-instructions"`) with five labelled rows and per-cell Copy buttons:

| Cell                  | Source                                                                 | When it's hidden                                                  |
|-----------------------|------------------------------------------------------------------------|-------------------------------------------------------------------|
| Type                  | static `"TXT"` from `DNS_INSTRUCTION_COPY.type`                       | never                                                             |
| Name (subdomain only) | `deriveSubdomainOnlyName(verificationName, hostname)` (pure helper)   | when the reveal can't resolve the active row from `domains`       |
| Name (full FQDN)      | `verificationName` from the active row                                 | falls back to the domain id if the active row is gone (defensive) |
| Value                 | the one-time `verificationValue` from `pendingVerificationValue`       | never (it's the entire point of the reveal)                       |
| TTL                   | static `"300 (or Auto)"` from `DNS_INSTRUCTION_COPY.ttl`              | never                                                             |

Each row has a Copy button with a labelled aria attribute (e.g. `"Copy DNS record name, subdomain-only form"`) so screen-reader users can copy each field independently. The legacy `"Copy verification value"` pill button below the table is preserved for back-compat — pre-WSA-FIX-3 muscle memory and test queries that target `/copy verification value/i` continue to work.

**Subdomain-only derivation.** `deriveSubdomainOnlyName(verificationName, hostname)` in `src/lib/integrations/dns-instructions.ts` strips `.${hostname}` from the FQDN exactly. The row's `hostname` acts as the **zone boundary**: most DNS providers expose a zone at the user's claimed domain, so for `verificationName = "_xynes.example.com"` + `hostname = "example.com"` the result is `"_xynes"` — Cloudflare's "Name" field accepts that directly. The helper falls back to the full FQDN for pathological inputs (no shared suffix, identical inputs, empty inputs) so the panel never renders an empty string. Pure helper — no DNS resolver, no external library, no network calls, no `eTLD+1` lookup table.

**"Where do I add this?" disclosure.** A `<details>` element below the table lists per-provider notes (Cloudflare, AWS Route 53, Namecheap, GoDaddy) and a `<a target="_blank" rel="noopener noreferrer">` link to the full verification guide at `https://docs.xynes.com/guides/verify-domain`. The link carries an `sr-only` "(opens in new tab)" hint per the repo's external-link convention.

**Auto re-verify on "I've added it".** The button (`aria-label="I've added it. Recheck DNS now."`) now:

1. Sets `aria-busy=true` and shows an inline "Re-checking…" spinner.
2. Calls `onVerifyDomain(domainId)` (the same handler the row's per-row "Recheck" button calls).
3. After the call resolves, reads the row's **post-call** status via a fresh `useRef(domains)` (not the stale `useCallback` closure) and decides:
   - row flipped to `verified` → dismiss the reveal and announce `"Domain verified."` in the polite region.
   - row stayed `pending`/`failed` OR the call rejected → keep the reveal OPEN and announce `"Still propagating — DNS records can take up to 24 hours to update."` so the user can re-copy the value and retry.
4. A separate "Dismiss" button (`aria-label="Dismiss verification value without rechecking"`) preserves the explicit-dismiss escape hatch for users who realize they need to revisit their DNS provider.

The status messages live in a sibling `<p role="status" aria-live="polite" data-testid="domain-verification-reveal-status">` so screen-reader users hear the recheck result without navigating back to the row's diagnostic strip.

**Out of scope (explicitly):** no background polling loop. The auto-recheck is a one-shot when the user clicks "I've added it"; further checks go through the row's per-row "Recheck" button. The status copy itself is owned by `DNS_INSTRUCTION_COPY.status` so future i18n work can move it into the message catalogue without changing the panel logic.

**Files:** `src/lib/integrations/dns-instructions.ts` + `dns-instructions.test.ts` (pure helper, 14 tests), `src/app/dashboard/integrations/components/DomainManagementPanel.tsx` + `DomainManagementPanel.test.tsx` (reveal UI + auto-recheck, +13 new tests).

### Domain verification reveal — modal UX polish (BUG-AUTH-7, landed 2026-06-01)

Builds on the WSA-FIX-3 structured reveal. Four user-visible polish items closing BUG-AUTH-7 of the Q2 bug-fix sprint:

1. **"We only show this value once" is now a Lumia DS `Alert variant="warning"`.** Previously a dense `<p>` at the top of the reveal that gave no visual weight to a one-time-only secret. The new Alert (`data-testid="domain-verification-one-time-warning"`) inherits Lumia's warning colour token and `role="alert"` so AT users hear it with the appropriate urgency. Title + description come from `DNS_INSTRUCTION_COPY.oneTimeWarning`.
2. **The dense helper paragraph is replaced by a 3-step `<ol>`** (`data-testid="domain-verification-steps"`, `aria-label="How to add the DNS TXT record"`). Each step is one sentence (`"Log in to your DNS provider."` / `"Add this TXT record on your domain."` / `"Come back here and click 'Verify domain'."`) so users can scan-and-do. Step copy comes from `DNS_INSTRUCTION_COPY.steps`.
3. **Success path:** when the auto-recheck flips the row to `verified`, the panel calls `useToast({variant: "success", ...DNS_INSTRUCTION_COPY.successToast})` for a transient confirmation, then schedules `setTimeout(onDismissVerificationValue, DNS_INSTRUCTION_COPY.autoDismissAfterMs)` (1.5 s) so the user has time to read the inline success state + toast before the reveal closes. The auto-dismiss timer id is held in a ref and cancelled by the cleanup `useEffect` and by `handleManualDismiss` so a stale post-success timer cannot fire after manual dismissal.
4. **Failure path:** the prior soft polite-region announcement is now backed by a Lumia DS `Alert variant="error"` (`data-testid="domain-verification-failure-alert"`) so the failure state has a stable, visually prominent anchor. The reveal stays open and the user can re-copy the value and retry. Copy comes from `DNS_INSTRUCTION_COPY.failureAlert` (`"We couldn't find the TXT record"` / `"DNS changes can take up to 48 hours to propagate. Double-check the record and try again later."`).

A new `verificationOutcome: "idle" | "success" | "failure"` state drives both transient surfaces. On a retry click the outcome resets to `idle` before the await, so the destructive Alert clears synchronously during the retry instead of hanging around as a stale callout.

`handleManualDismiss` is a small wrapper around the container's `onDismissVerificationValue` prop: it cancels any pending auto-dismiss timer, resets `verificationOutcome` + the polite-region message, then forwards to the container. The `Dismiss` button is wired through this helper instead of calling the bare prop.

**Out of scope (explicitly):** no background polling, no email-based re-verification, no schema changes (the reveal continues to fail closed against missing rows by falling back to the FQDN-only Name cell). i18n migration of the panel copy is still pending the repo-wide auth-app migration to `next-intl`; BUG-AUTH-7 follows the WSA-FIX-3 pattern and keeps new strings in `DNS_INSTRUCTION_COPY` as i18n-ready constants so the eventual catalog move stays a single-file edit.

**Files:** `src/lib/integrations/dns-instructions.ts` (+`oneTimeWarning`, `steps`, `failureAlert`, `successToast`, `autoDismissAfterMs`), `src/app/dashboard/integrations/components/DomainManagementPanel.tsx` (+`Alert`, `useToast`, `verificationOutcome`, auto-dismiss timer + cleanup, `handleManualDismiss`), `src/app/dashboard/integrations/components/DomainManagementPanel.test.tsx` (+7 BUG-AUTH-7 tests), `src/app/dashboard/integrations/components/WorkspaceIntegrationsDashboard.test.tsx` (+`useToast` to the Lumia DS mock so container tests don't crash). Suite: **892/892 pass / 86 files** (was 885 → +7 net new). Coverage overall 90.7% stmts / 83.49% branches / 90.22% funcs / 90.7% lines (above ADR-001 80% floor). Build `/dashboard/integrations` route 9.12 → **9.48 kB** (+0.36 kB).

### Cross-app workspace handoff (FE-XAPP-BUG-001, landed 2026-05-12)

Workspace identity does NOT travel across app origins. The Auth App and CMS Console each persist their own `xynes_workspace_id` localStorage entry, scoped to their own origin. Without an explicit handoff, clicking "Manage in Workspace Admin" from CMS Console (while CMS has Workspace A selected) silently lands the user on Workspace B because the Auth App resolves `currentWorkspace` from its own independent localStorage.

**Contract.** Deep links from other Xynes apps may carry an optional `?workspace=<slug>` query parameter. The Auth App resolves the slug against `useAuth().workspaces` (server-authoritative via `/me`) and, on match, calls `selectWorkspace(matchedId)` then strips the param from the URL via `router.replace(..., { scroll: false })`. The slug is NOT a permission grant — a non-member or unknown slug fails closed, leaves the prior selection alone, emits a `console.warn` for dev visibility, and still strips the param so refreshes don't keep warning.

**Component.** `src/components/dashboard/WorkspaceHandoffSync.tsx` is a "render null" client component mounted inside `AuthDashboardShell`. It honors the handoff on every dashboard route (not just `/dashboard/integrations`) so future cross-app deep links automatically participate in the contract. The component:

- Reads `?workspace=<slug>` from `useSearchParams()`.
- Waits for `useAuth().isLoading` and `useWorkspace().isLoading` to clear so a valid slug is never mis-classified as "unknown" during the initial bootstrap.
- Matches `workspaces` case-insensitively against the trimmed slug.
- Tracks the last processed slug in a `useRef` so repeated re-renders for unrelated reasons (search-param object identity churn) don't reprocess.
- Preserves any other query params already on the URL (e.g. `tab`, `preset`) when stripping `workspace`.

**Suspense boundary (Codex review follow-up).** `AuthDashboardShell` mounts `<WorkspaceHandoffSync />` inside a local `<Suspense fallback={null}>`. Next.js 15 requires `useSearchParams()` callers to be inside a Suspense boundary for static prerender; the providers layer already provides an ancestor Suspense, but scoping it locally at the shell makes the contract self-contained — future dashboard routes don't need to know about this constraint, and a future agent moving the providers' Suspense can't accidentally break dashboard builds. The fallback is `null` because the component renders nothing anyway.

**Security invariants.**

- The slug is sanitised by `.trim()` + `.toLowerCase()` and matched against the user's own workspaces only. A URL-encoded malicious slug (`workspace=safarnama%3B%20DROP%20TABLE%20workspaces`) is never dispatched to `selectWorkspace` because it never resolves to a known workspace.
- `selectWorkspace` is only ever called with a workspace ID resolved from `useAuth().workspaces`. The raw slug is never used as a dispatcher arg.
- An attacker cannot use this surface to elevate scope. At worst they can re-arrange which of the user's own workspaces is currently selected — the same thing the user can do from the workspace switcher.
- The slug never appears in error messages or downstream API calls; it lives in the URL only until `router.replace` strips it.

**Compatibility.** Pre-FE-XAPP-BUG-001 links (no `?workspace=` param) work with zero behaviour change — the recipient falls through to its existing localStorage-based selection. The `WorkspaceProvider`'s auto-select-when-one-workspace behaviour is unchanged.

**Files:** `src/components/dashboard/WorkspaceHandoffSync.tsx` (NEW, ~150 lines), `WorkspaceHandoffSync.test.tsx` (NEW, 12 tests covering known/unknown/whitespace/loading/case-insensitive/raw-slug-leakage/multi-param preservation/no-op-when-already-selected), `src/components/dashboard/AuthDashboardShell.tsx` (mounts `<WorkspaceHandoffSync />` inside the shell — single line of behaviour change).

**Tests touched (mocks extended, no behaviour change):** `AuthDashboardShell.integration.test.tsx`, `AuthDashboardShell.i18n.test.tsx`, `AuthDashboardShell.uxr7-smoke.test.tsx` — the existing `next/navigation` mocks added `useSearchParams: () => new URLSearchParams("")` and a `replace: vi.fn()` on the router so the new child component can render. The `selectWorkspace` mock was already present on `useWorkspace()` from prior UXR-5 work.

**Origin app side.** The CMS Console emits the `?workspace=<slug>` parameter from `xynes-front-end/xynes-cms-console-web/src/features/integrations/workspace-admin-links.ts`. See that repo's `docs/DEVELOPER.md` for the link builder contract.

### Container patterns to reuse

Pin `getAccessToken` to a `useRef` so the load effect doesn't re-fire on every parent re-render. The auth-sdk's `useAuth()` may return a fresh function reference, and listing it in the effect dependency array causes a refetch storm:

```tsx
const getAccessTokenRef = useRef(getAccessToken);
useEffect(() => { getAccessTokenRef.current = getAccessToken; }, [getAccessToken]);
useEffect(() => {
  const callerGetAccessToken = () => getAccessTokenRef.current();
  // use callerGetAccessToken in client calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [apiBaseUrl, workspaceId, reloadCounter]);
```

Defensively coerce `Promise.all` results before storing them so a misbehaving mock or future client refactor cannot crash the dashboard:

```tsx
setDomains(Array.isArray(nextDomains) ? nextDomains : []);
```

### Security invariants

- Bearer auth uses the existing Supabase access token from `useAuth().getAccessToken`. **Never** put workspace API keys in the browser; they are programmatic credentials for the gateway, not for browser sessions.
- Raw API keys are surfaced exactly once by the create-key reveal flow in `ApiKeyManagementPanel` (Task 4) and MUST never be persisted (no `localStorage`, no logs, no parent-state leakage).
- The DNS-TXT `verificationValue` is shown exactly once on register and never re-fetched; the server stores only its hash.
- The container's permission-denied (403) state renders the safe, non-leaky message: "You don't have permission to manage workspace integrations."

### Error handling — action errors vs load errors (WSA-FIX-1, 2026-05-12)

The container distinguishes **two kinds of error** so an action failure never wears the "Couldn't load integrations" copy, and a list refetch failure never wears an action title like "Couldn't remove domain":

- **`loadError`** — surfaces failures of the initial list refetch or an explicit Retry. Renders the destructive Alert titled **"Couldn't load integrations"** with a Retry button.
- **`actionError`** — surfaces failures of a single mutation (`registerDomain`, `verifyDomain`, `regenerateVerification`, `deleteDomain`, `createApiKey`, `revokeApiKey`). Renders a destructive Alert with an action-specific title (`"Couldn't add domain"`, `"Couldn't verify domain"`, `"Couldn't regenerate verification value"`, `"Couldn't remove domain"`, `"Couldn't create API key"`, `"Couldn't revoke API key"`). Successful action handlers clear `actionError` before they refetch; the alert also exposes a **Dismiss** button (`aria-label="Dismiss action error"`).
- **`reloadFailedAfterAction`** — when an action succeeds but the follow-up list refetch fails (transient 5xx, token expiry mid-flight, network glitch), the container surfaces a softer **warning** Alert titled "Couldn't refresh the list" (`data-testid="workspace-integrations-reload-failed"`) with copy "Action succeeded, but we couldn't refresh the list. Some rows may be out of date until you retry." and a Retry button. **The destructive "Couldn't load integrations" alert is NEVER shown for a post-action refetch failure** — the action did succeed and the page is not broken.

Status-code → user-facing copy mapping for action errors (`getIntegrationsActionErrorMessage`):

- `401` → "Your session has expired. Please sign in again."
- `403` → "You don't have permission to manage workspace integrations."
- `404` → "We couldn't find that record. It may have already been removed."
- `409` → "That conflicts with an existing record. Please review and try again."
- `422` → "Some of the values you provided aren't valid. Please review and try again."
- `429` → "Too many requests. Please try again in a moment."
- anything else → action-specific generic copy (e.g. "We couldn't remove this domain. Please try again.")

Internal-only fields (`keyHash`, `verificationValueHash`, raw API keys, stack traces, upstream error messages) **must never** leak into either alert.

### Onboarding redirect — origin-app-aware post-create destination (WSA-FIX-2, 2026-05-12)

`src/app/onboarding/page.tsx` and `src/components/onboarding/CreateWorkspaceForm.tsx` no longer hard-code the CMS console as the post-create destination. The flow is now origin-app-aware so users land back where they came from after creating a workspace.

- **Page reads `?redirect=<url>`.** `OnboardingPage` is an async RSC that awaits `searchParams` (Next.js 15 contract) and forwards the optional `redirect` query value to `CreateWorkspaceForm` as the `redirectUrl` prop. The page itself does **not** validate the URL — that responsibility stays in the form (single security boundary).
- **Validation contract is unchanged.** `CreateWorkspaceForm` keeps using `getSafeRedirectUrl(redirectUrl, defaultTarget, getAllowedRedirectDomains())` from `src/lib/redirect/`. Disallowed hosts, `javascript:` / `data:` / `vbscript:` schemes, and protocol-relative (`//evil.example/...`) URLs all fall through to `defaultTarget` exactly as before. `getAllowedRedirectDomains()` was **NOT** widened — open-redirect protection is the same.
- **`defaultTarget` flipped from CMS to Auth Admin.** Without an explicit `redirectUrl`, the form now resolves to `/dashboard/apps` (the Auth Admin dashboard) instead of `${NEXT_PUBLIC_CONSOLE_URL}/dashboard/<slug>/content`. The CMS console is reached **only** when the caller forwarded `?redirect=https://cms.xynes.com/dashboard` (or its localhost equivalent).
- **Per-origin routing:**
  - **Auth Admin → switcher → "Create new workspace"** → `router.push("/onboarding")` (no query) → after create → `/dashboard/apps`.
  - **CMS Console → switcher → "Create new workspace"** → `window.location.assign("http://localhost:3100/onboarding?redirect=...")` → after create → `window.location.assign("http://localhost:3000/dashboard")` → CMS dashboard resolver picks the user's current/first workspace and routes to `/dashboard/<slug>/content`.
  - **Tampered `?redirect=https://evil.example/`** → falls back to `/dashboard/apps`.
- **Out of scope.** No new redirect-allowlist hosts were added. The `redirect=` semantics for `/login`, `/logout`, `/signup`, `/invite`, and `/forgot-password` are not part of this change — they remain owned by `buildAuthRedirectUrl` and the per-route flows. There is **no** "stay on Auth app" toggle UI on the form; the destination is fully driven by the inbound query param.
- **Companion CMS console change.** `xynes-front-end/xynes-cms-console-web/src/components/dashboard/CmsDashboardShell.tsx` is the only call site that needs to attach `?redirect=`. It builds the redirect target from `NEXT_PUBLIC_APP_URL` (the CMS's own base URL). If `NEXT_PUBLIC_APP_URL` is unset or malformed (`javascript:...`, non-http(s) scheme, invalid URL), the `?redirect=` is omitted entirely and the user gracefully falls back to the Auth-Admin destination.

### Onboarding copy + visual streamline (BUG-AUTH-1, 2026-05-30)

`/onboarding` is the first transactional surface a fresh user sees after sign-up, so it must feel like the same family as `/login` + `/signup` rather than a marketing page. BUG-AUTH-1 tightens the copy and migrates every visible string into the `auth.onboarding` namespace.

- **Architecture.** `src/app/onboarding/page.tsx` stays an async RSC and owns only the WSA-FIX-2 `?redirect=<url>` parse + forward. The visible markup moved to a new client component, `src/components/onboarding/OnboardingScreen.tsx`, so it can resolve catalog strings through `useTranslations("auth.onboarding")` and reuse Lumia DS `Flex`.
- **Visual streamline.** The marketing hero block (gradient `from-background to-muted/30` backdrop, oversized X icon, "Welcome to Xynes" headline + collaboration-themed subtitle) was retired. The screen now reads as: tight page header → single Lumia DS `Card` with the form → help footer with docs + support links. The form's own redundant icon-in-circle + subtitle block was deleted; only a single visually-hidden `<h2>` remains for accessible-name parity with the integration test (`getByRole("heading", { name: /create your workspace/i })`).
- **Copy budget.** ~41 words of marketing/instructional copy collapsed to ~17 (~41% of the original), well under the acceptance ceiling of ≤ 60%.
- **Catalogs.** `messages/en-US/auth.onboarding.json` is the source of truth. `messages/en-US/auth.onboarding.meta.json` is the translator-context sidecar. `messages/en-XA/auth.onboarding.json` is regenerated via `pnpm generate:pseudo`.
- **External-link a11y.** The docs link in the page footer carries the canonical `target="_blank" rel="noopener noreferrer"` pair plus a screen-reader-only `(opens in new tab)` hint — same pattern as `DomainManagementPanel.tsx`.
- **Out of scope, deliberately deferred.** Zod validation error messages in `src/lib/workspace/validation.ts` and the slug-availability strings returned by `getSlugStatusMessage` are still English-only. They have their own dedicated unit test suite (`validation.test.ts`) and migrating them is a follow-up i18n story; this avoids expanding BUG-AUTH-1 into a cross-module refactor.
- **WSA-FIX-2 contract preserved byte-for-byte.** The seven `?redirect=` test cases in `page.test.tsx` (forward / undefined / whitespace / empty / multi-value / hostile host / open redirect) continue to pass against the mocked `<OnboardingScreen>`.

### Newly-created workspace surfaces without reload (BUG-AUTH-2, 2026-05-30)

Before BUG-AUTH-2, creating a workspace through `/onboarding` (or the switcher → "Create new workspace" flow) landed the user on `/dashboard/apps` with **the old selected workspace** in the switcher and **the new workspace missing from the dropdown list** until they hard-reloaded the page. The bug came from `CreateWorkspaceForm.onSubmit` doing `router.push("/dashboard/apps")` without first invalidating the auth-SDK in-memory workspace cache or telling `WorkspaceProvider` which workspace should now be active.

- **Architecture.** The fix lives across two repos. `xynes-auth-sdk` gains a new `useAuth().refreshWorkspaces()` method on `AuthProvider`. `xynes-auth-app`'s `CreateWorkspaceForm` calls `await refreshWorkspaces()` followed by `selectWorkspace(newWorkspace.id)` **before** navigating, so the dashboard renders with the new workspace already in the list AND already active.
- **SDK contract (`@xynes/auth-sdk`).** `refreshWorkspaces()` re-fetches `/me` against the gateway **without** rotating the Supabase refresh token. Posture: no-op when logged out; never throws; busts the per-token bootstrap dedupe latch so a same-token caller still hits the network; on 401/403 falls back to the canonical signed-out state (mirrors `handleSessionChange`); on a transient network failure deliberately **leaves the existing in-memory `workspaces` untouched** (we do NOT route through `handleSessionChange`, which would wipe the list to `[]` on a transient failure). Documented inline on `AuthContextValue.refreshWorkspaces`.
- **Ordering in the form.** `CreateWorkspaceForm.onSubmit` runs `await refreshWorkspaces()` → `selectWorkspace(resolvedWorkspace.id)` → redirect (`router.push` or `window.location.assign`). If `refreshWorkspaces()` throws (regression guard — it is documented as never-throws), the redirect still fires and `selectWorkspace` still runs — the user is never stranded on `/onboarding`. Worst case, the dashboard recovers on its next `/me` round trip.
- **Selection contract.** `selectWorkspace` accepts a workspace **ID string** only, never the workspace object. The form passes `resolvedWorkspace.id`. A regression test asserts the call shape (single string argument).
- **Awaited selection (Codex PR #63 review feedback).** Both `refreshWorkspaces()` and `selectWorkspace(id)` are `await`-ed and individually wrapped in defensive try/catch blocks. `selectWorkspace` is currently synchronous in the SDK, but one other call site in this app (`src/app/workspaces/page.tsx`) already awaits it, and the SDK contract does not pin the return type. Awaiting today is a no-op that costs nothing and preserves the refresh → select → navigate ordering if the SDK ever gains async persistence (e.g. the cross-app cookie sync direction discussed in FE-XAPP-BUG-001). Either failure path swallows the rejection so the user is never stranded on `/onboarding`.
- **Gateway envelope handling preserved.** The form already unwraps both the legacy flat response (`{ id, slug, name }`) and the gateway double-envelope (`{ ok, data: { id, slug, name } }`). BUG-AUTH-2 does not change this — `resolvedWorkspace.id` is extracted the same way it was before, and a dedicated test asserts the envelope path still produces the right id.
- **WSA-FIX-2 contract preserved byte-for-byte.** Every WSA-FIX-2 redirect-allowlist test (relative path, valid Xynes host, disallowed host, protocol-relative `//evil.example/`, missing `redirectUrl`) still passes — the new refresh/select calls happen on the same code path regardless of which redirect target is chosen.
- **CMS-API-KEY-ACTOR-1 Story C parity.** `refreshWorkspaces()` is a no-op for an `api_key` actor in the SDK because session-less paths return early. Workspace creation in the CMS console always runs through the gateway as a user actor (no preset key today gates `accounts.workspaces.create`), so this is informational only — the form never sees an api_key actor in practice.
- **Tests.** `CreateWorkspaceForm.integration.test.tsx` adds 5 BUG-AUTH-2 cases (ordering before redirect, ID-not-object selectWorkspace shape, envelope-wrapped id, refresh-throws-still-redirects, 409-skips-everything). `AuthProvider.test.tsx` adds 4 BUG-AUTH-2 cases on the SDK side (no-op when logged out, happy-path bumps workspaces without rotating tokens, transient failure preserves list, dedupe-latch bypass regression guard).
- **Out of scope, deliberately deferred.** No change to `WorkspaceProvider` persistence semantics. No change to `AuthGuard` or the cross-app handoff contract (FE-XAPP-BUG-001's `?workspace=<slug>` path is orthogonal — it triggers on an inbound URL param; BUG-AUTH-2 triggers on a freshly-created workspace). Standalone (non-shell) `WorkspaceSwitcher.tsx` is not changed — it already reflects `useAuth().workspaces` on its own re-render and will pick up the new workspace as soon as `refreshWorkspaces()` settles.

### Profile menu "Coming soon" placeholder route (BUG-AUTH-3a, 2026-05-30)

The avatar menu's "Profile" item previously pointed at a route that did not exist, so clicking it landed on a 404. BUG-AUTH-3a fixes the menu wiring AND ships a polished placeholder page so the destination feels intentional. The real self-service profile editor is a future story (out of scope for this sprint per `2026-05-29-q2-bugfix-sprint-stories.md` §7).

- **Architecture.** `src/app/profile/page.tsx` is a thin client component that mounts `AuthGuard` → `AuthDashboardShell` → `ProfileComingSoon`. The shell is the same one every dashboard route uses, so the sidebar, scroll containment (BUG-LDS-1), and workspace context all behave identically to the rest of the app. `src/components/profile/ProfileComingSoon.tsx` is the visible client component; it resolves every string through `useTranslations("auth.profile")`.
- **Menu wiring.** `AuthDashboardShell.tsx` now passes `onProfileOpen={() => router.push("/profile")}` to the Lumia DS `DashboardShell`. The shell already exposed this hook (`onProfileOpen?: () => void`); we were just not wiring it. Logout wiring (`onLogout={() => router.push("/logout")}`) is unchanged.
- **`activeNav` for off-nav destinations.** `AuthDashboardShellProps.activeNav` is constrained to a closed `AuthDashboardNavKey` union; `/profile` is intentionally not one of those keys because it lives in the avatar menu, not the sidebar. The route passes `activeNav="settings"` as a closed-type-safe default — `usePathname()` returns `/profile`, which does NOT match any sidebar `href`, so no nav item visually highlights. This is the intended UX for avatar-menu destinations.
- **Lumia DS composition.** The page uses `Flex` + `Card` + `Badge` from `@lumia-ui/components`. The "Coming soon" pill is `Badge variant="subtle"`. The Card carries a heading, body paragraph (no roadmap dates), and two text-only links: `mailto:support@xynes.com` ("Contact support", no `target="_blank"` because mailto is internal-by-protocol) and `<Link href="/dashboard/apps">` ("Back to dashboard"). No card-in-card; no app-level CSS overriding shell internals.
- **Catalogs.** `messages/en-US/auth.profile.json` is the source of truth (`page.title`, `page.subtitle`, `comingSoon.{badge,heading,body,supportLabel,backLabel}`). `messages/en-US/auth.profile.meta.json` is the translator-context sidecar (no roadmap promises; keep tone calm + neutral; closed-set badge ≤ 14 chars). `messages/en-XA/auth.profile.json` is regenerated via `pnpm generate:pseudo`. The `auth.profile` namespace is wired into `src/i18n/config.ts` and the global `vi.mock("next-intl", ...)` in `src/test/setup.ts`.
- **Tests.** `src/components/profile/ProfileComingSoon.test.tsx` adds 7 cases (en-US: title/subtitle, badge+heading+body, mailto support link, /dashboard/apps back link, no secret-shaped leak; en-XA: pseudo-localised title/subtitle, pseudo-localised links but canonical hrefs). `src/app/profile/page.test.tsx` adds 3 cases (route mounts inside AuthDashboardShell, renders ProfileComingSoon not an under-development panel, `activeNav="settings"` default). `AuthDashboardShell.integration.test.tsx` gains 1 case asserting the new `onProfileOpen` wiring. `src/i18n/config.test.ts` gains assertions that `messages.auth.profile` is defined for every supported locale.
- **Coverage.** `src/components/profile/` lands at 100% statements / 100% branches / 100% functions / 100% lines. `src/app/profile/page.tsx` is excluded from coverage instrumentation by repo policy (`src/app/**` exclusion in `vitest.config.ts`) — the page-level behaviour is still exercised by `page.test.tsx`.
- **AGENTS.md §7 rule 9 honoured.** No app-level CSS overrides of the dashboard shell were introduced. The Lumia DS `DashboardShell` already exposes a `profile.profileAction` label slot AND an `onProfileOpen` callback — we just consumed them.
- **Out of scope, deliberately deferred.** Real self-service profile editing (avatar upload, display name, password reset, 2FA, notification preferences) lives in a future story. Sprint plan §7 lists this explicitly.

### Logout toast feedback (BUG-AUTH-3b, 2026-05-30)

Before BUG-AUTH-3b, clicking **Logout** from the dashboard avatar menu silently navigated to `/logout` (a server-side route that calls Supabase `signOut`, clears auth cookies, and 302s to `/login`). Because the navigation is a server-side redirect, the user saw no immediate confirmation — the UI just blanked, then the login page appeared. Trust-breaking on a destructive action. BUG-AUTH-3b adds a Lumia DS `Toast` immediately on click so the user knows the sign-out flow has started, and surfaces a destructive toast if the client-side navigation itself throws (rare but worth handling so the user is never stuck in a silent failure).

- **Architecture.** The fix is purely client-side and sits on top of the existing `/logout` server route (`src/app/logout/route.ts`) — that route already does the actual signOut + cookie clear + 302 to `/login`, is defensive (always 302s even if Supabase signOut throws), and is unchanged by this story. `AuthDashboardShell.tsx` now calls `useToast()` from `@lumia-ui/components` and wraps the previous `() => router.push("/logout")` in a memoized `handleLogout` that (1) fires a `variant="success"` toast first, (2) attempts `router.push("/logout")`, (3) on a thrown navigation surfaces a `variant="error"` toast and logs to `console.error` for ops visibility (raw error text is NEVER rendered to the user — closed-set toast copy only).
- **Provider wiring.** `src/app/providers.tsx` mounts the Lumia DS `<ToastProvider>` between `<FeatureFlagsProvider>` and `<AuthProvider>` so every authenticated route below has access to `useToast()`. Default duration (5 s) is sufficient for the logout case because the server-side redirect to `/login` typically resolves in ~500 ms; the toast carries through visually until then. Future stories may reuse this provider for invite copy confirmations, workspace switch feedback, etc.
- **i18n.** Four new keys land under `auth.dashboard.shell.logout` (`successTitle`, `successDescription`, `errorTitle`, `errorDescription`). The translator-context sidecar in `auth.dashboard.meta.json` documents the success-vs-failure surface and the length budget (≤ 40 chars on titles so they don't wrap on narrow viewports). en-XA pseudo-locale is regenerated via `pnpm generate:pseudo` and tested explicitly.
- **Toast accessibility.** Lumia DS's `<ToastProvider>` maps `variant="success"` → `role="status"` (polite SR announcement; non-interrupting) and `variant="error"` → `role="alert"` (assertive SR announcement). Both variants carry a dismiss button. The role mapping itself is covered by the lumia-ds toast unit tests; consumer tests assert the variant prop only.
- **No raw error text reaches the UI.** A thrown `router.push` is caught, logged to `console.error` with the closed-set string `"[AuthDashboardShell] logout navigation failed"` plus the `Error` instance for ops visibility, but the user-visible toast carries only the i18n-resolved closed-set copy. Regression-guarded by a test that throws a simulated error and asserts the destructive toast carries only the catalog copy.
- **Tests.** `AuthDashboardShell.integration.test.tsx` adds 3 BUG-AUTH-3b cases (ordering — toast fires before navigation; success-variant + i18n-resolved copy; failure path surfaces error toast + keeps the user on the dashboard) and extends the existing logout test to also assert the success toast. `AuthDashboardShell.i18n.test.tsx` adds 1 catalog-shape parity case (en-US + en-XA both expose the 4 logout keys; pseudo-locale wraps characters as expected). Two existing test files (`AuthDashboardShell.i18n.test.tsx`, `AuthDashboardShell.uxr7-smoke.test.tsx`) gain a `vi.mock("@lumia-ui/components", …)` stub because they don't mount a real `<ToastProvider>` — the shell now calls `useToast()` so the hook must be mocked or it throws the documented "must be used within a ToastProvider" error.
- **Coverage.** `src/components/dashboard/AuthDashboardShell.tsx` lands at 99.32% statements / 91.66% branches / 87.5% functions / 99.32% lines (above the ADR-001 80% floor). The one uncovered line is the pre-existing `handleWorkspaceSelect` unknown-id guard.
- **AGENTS.md §7 rule 9 honoured.** Toast is a Lumia DS primitive consumed directly; no app-level CSS overrides of toast styling or positioning were introduced. `<ToastProvider>` is mounted at the auth-app root so the contract is identical to the CMS Console's existing posture (which mounts `<ToastProvider>` inside its `src/app/providers.tsx` too).
- **Out of scope, deliberately deferred.** No change to the `/logout` server route — its existing signOut + cookie-clear + redirect-validation contract is sufficient. No change to the SDK `signOut()` method — the server route uses Supabase's server-side client directly. No login-page toast about "you've been signed out" (the redirect lands on `/login` quickly enough that the dashboard-side toast carries the user through; a future story can add a login-page banner if product wants stronger persistence).

### Follow-up stories from browser revalidation

- `fix(accounts-service): return safe validation errors for workspace domain create` — Browser revalidation on 2026-05-05 confirmed the frontend calls `POST /workspaces/:workspaceId/domains` through the gateway, but local backend creation of `example.com` failed with Postgres check constraint `workspace_domains_hostname_shape` and surfaced to the browser as `500 Internal Server Error`. The backend should align hostname normalization/validation with the database constraint and return a safe 4xx validation response instead of an internal error.
- `fix(accounts-service): redact workspace-domain verification hashes from DB error logs` — The same failed create path logged the failed insert query and parameters, including `verification_value_hash`. Domain verification secret material must remain hash-only in storage and must not appear in service logs, error payloads, telemetry snippets, or debugging output.

## Translation Prototype (Story 3, 2026-05-09)

Pilot covering login, signup, forgot/reset password, invite entry, workspace selector, and shared auth error mapping (OAuth code → catalog key). Authoring pattern matches the CMS console pilot (Story 2) so a single locale cookie is honored across the platform.

### Wiring

- Catalogs live under `messages/<locale>/auth.<surface>.json` with translator metadata sidecars in `messages/<locale>/auth.<surface>.meta.json`. Sidecars are not loaded at runtime.
- Locale negotiation is centralised in `src/i18n/config.ts` (`AUTH_LOCALE_COOKIE = "xynes_locale"`, `resolveAuthLocale`, `getAuthMessages`). Hostile inputs (path-traversal, `javascript:` URIs, non-strings, unsupported BCP-47) fail closed to `en-US`.
- The static map in `getAuthMessages` is keyed on `Locale`, so a hostile cookie cannot drive a dynamic import path.
- `src/app/layout.tsx` resolves the locale from the cookie + `Accept-Language` header, then passes catalogs into `Providers` which wraps everything in `NextIntlClientProvider`. URL routes are intentionally unchanged — there is no `[locale]` segment, so callbacks (`/callback`, `/logout`, invite tokens, `/dashboard/*`) keep working byte-for-byte.

### Pilot surfaces

| File | Catalog namespace |
| --- | --- |
| `src/components/auth/forms/LoginForm.tsx` | `auth.login`, `auth.common`, `auth.errors.alertTitles` |
| `src/components/auth/forms/SignupForm.tsx` | `auth.signup`, `auth.common`, `auth.errors.alertTitles` |
| `src/components/auth/forms/ForgotPasswordForm.tsx` | `auth.forgotPassword`, `auth.common` |
| `src/components/auth/forms/ResetPasswordForm.tsx` | `auth.resetPassword`, `auth.common` |
| `src/components/invite/InviteEntryForm.tsx` | `auth.invite.form`, `auth.invite.errors` |
| `src/components/invite/InviteEntryShell.tsx` | `auth.invite.shell` |
| `src/components/workspace/WorkspaceSelector.tsx` | `auth.workspaces.selector` |
| `src/components/auth/navigation/AuthRouteSwitch.tsx` | `auth.common.routeSwitch` |
| `src/components/ui/AuthDivider.tsx` | `auth.common.divider` |
| `src/app/login/login.client.tsx` | `auth.common.loading`, `auth.errors.alertTitles`, `auth.errors.oauth` |
| `src/app/forgot-password/page.tsx` | `auth.forgotPassword.page` |
| `src/app/reset-password/page.tsx` (`InvalidLink`) | `auth.resetPassword.invalidLink` |
| `src/app/workspaces/page.tsx` | `auth.workspaces.page` |
| `src/components/dashboard/AuthDashboardShell.tsx` (UXR-5) | `auth.dashboard.navigation`, `auth.dashboard.shell.*` |
| `src/components/workspace/WorkspaceSwitcher.tsx` (UXR-5) | `auth.dashboard.workspaceSwitcher` |
| `src/components/onboarding/OnboardingScreen.tsx` (BUG-AUTH-1) | `auth.onboarding.page`, `auth.onboarding.footer` |
| `src/components/onboarding/CreateWorkspaceForm.tsx` (BUG-AUTH-1) | `auth.onboarding.form` |
| `src/components/profile/ProfileComingSoon.tsx` (BUG-AUTH-3a) | `auth.profile.page`, `auth.profile.comingSoon` |

#### Dashboard shell label contract (UXR-5, 2026-05-10)

The Auth Admin dashboard shell now flows every visible string through the `auth.dashboard` catalog so Lumia DS stays product-copy-neutral and pseudo-locale rendering can stress dense nav, sidebar, mobile bottom-bar, and workspace-switcher labels.

- **Catalog.** `messages/en-US/auth.dashboard.json` is the single source of truth for:
  - `navigation.*` — the eight Auth Admin destination labels (Apps, Directory, Access Control, Security, Integrations, Logs, Billing, Settings). Aligned with the Cross-App Navigation Vocabulary in `xynes/xynes-infra/docs/research/ux-review/02-cross-app-navigation-vocabulary.md`.
  - `shell.navigation.*` — landmark and screen-reader aria labels (`mainContent`, `sidebar`, `sidebarScrollArea`, `dashboardNavigation`, `mobileDashboardNavigation`, `mobileMenu`, `openMobileMenu`).
  - `shell.workspace.*` — workspace switcher labels (`trigger`, `currentSection`, `currentBadge`, `switchToSection`, `createAction`, `createUnavailableAction`, `fallbackName`).
  - `shell.workspaceCreationDisabledMessage` — explanatory tooltip when creation is disabled.
  - `shell.profile.*` — avatar/profile menu (`trigger`, `profileAction`, `logoutAction`).
  - `shell.notifications.*` — notification drawer labels including ICU patterns `titlePattern: "Notifications ({unreadCount})"`, `unreadCountPattern: "{unreadCount} unread notifications"`, `deletePattern: "Delete notification {title}"`.
  - `shell.userMenu.fallbackName` / `shell.userMenu.fallbackEmail` — used when the SDK has no `displayName` / `email` and the consumer didn't pass `profileSubtitle`.
  - `shell.footerNote` — sidebar bottom note.
  - `workspaceSwitcher.*` — labels for the legacy `src/components/workspace/WorkspaceSwitcher.tsx`. Production routes use the Lumia shell switcher; this catalog is for the standalone component so its copy can't drift from the shell.
- **Bundle plumbing.** `AuthDashboardShell` consumes the catalog via `useTranslations("auth.dashboard.*")` and forwards a typed `DashboardShellLabels` bundle to `<DashboardShell labels={...} />` from `@lumia-ui/layout`. Lumia's English defaults still ship for callers that omit `labels`, so this stays additive — design-system contracts are not blocked by app-copy ownership.
- **Navigation spec.** `src/components/dashboard/navigation.ts` now exports `DASHBOARD_NAV_SPECS` (each entry carries a stable `key`, `messageKey`, `href`, `icon`, and `defaultLabel`). The legacy `DASHBOARD_NAV_ITEMS` is preserved as a derived English-default array for backwards-compatible callers.
- **Translator metadata.** `messages/en-US/auth.dashboard.meta.json` documents per-key purpose, target audience (workspace administrators), and a `consumes` array pointing at the Lumia layout types (`DashboardShellLabels` and `DashboardWorkspaceSwitcherLabels`) so translators know which strings appear in screen-reader output vs. visible UI.
- **Icon registry adoption (UXR-3 follow-up).** `src/components/workspace/WorkspaceSwitcher.tsx` no longer ships inline `ChevronDownIcon` / `PlusIcon` SVGs. Both are now resolved through `<Icon name="chevron-down" />` and `<Icon name="add" />` from `@lumia-ui/icons` (Lumia's default registry). The icons remain decorative (`aria-hidden`); the action's accessible name still comes from the surrounding button/menu item.
- **Workspace switcher posture.** Dashboard-shell workspace switching is owned by Lumia's `DashboardWorkspaceSwitcher` (UXR-2), invoked via `DashboardShell.workspace*` props. The standalone `<WorkspaceSwitcher />` component is no longer mounted by any production route in this app; it is kept as a translated, icon-registry-aligned reference for any future surface that needs an embedded workspace picker outside the shell.
- **Tests.** `src/components/dashboard/AuthDashboardShell.integration.test.tsx` covers nav-label localization, the full `DashboardShellLabels` bundle (navigation + workspace + profile + notification ICU patterns), `workspaceCreationDisabledMessage`, `sidebarFooterNote`, and translated user-menu fallbacks. `src/components/dashboard/AuthDashboardShell.i18n.test.tsx` runs the real `NextIntlClientProvider` against en-US and en-XA catalogs to assert the en-XA pseudo-locale propagates through nav labels and the shell label bundle, and that no raw catalog-key path leaks to the DOM. `src/components/workspace/WorkspaceSwitcher.integration.test.tsx` adds a UXR-3 / UXR-5 describe block that asserts the chevron and plus icons resolve through the Lumia registry (`data-icon-name="chevron-down"` / `data-icon-name="add"`) and remain `aria-hidden`.

### Common auth error mapping

`src/lib/oauth/errors.ts` exposes `getOAuthErrorMessageKey(errorCode)` which returns a closed-set translation key (`access_denied | invalid_request | … | fallback`). Unknown error codes collapse to `fallback` so a hostile OAuth provider cannot inject arbitrary copy through the URL `?error=` parameter. Translated copy lives under `auth.errors.oauth.<key>`. The legacy `getOAuthErrorMessage` / `OAUTH_ERROR_MESSAGES` (en-US source of truth) remain exported for the callback flow which cannot reach the next-intl client.

#### SDK error code localization (TFU-2, 2026-05-09)

`@xynes/auth-sdk` exports a parallel helper for backend-derived auth errors:

```ts
import { getAuthErrorMessageKey, AUTH_ERROR_MESSAGE_KEYS } from "@xynes/auth-sdk";

const error = normalizeAuthError(supabaseError);
// `error.code` is a closed-set `AuthErrorCode`; `error.message` is the SDK's en-US fallback.
const messageKey = getAuthErrorMessageKey(error.code); // -> e.g. "invalid_credentials"
const localized = t(`auth.errors.codes.${messageKey}`); // resolves through next-intl
```

The auth-app's `<AuthErrorAlert>` consumes this helper directly: the alert body is resolved via `useTranslations("auth.errors.codes")(getAuthErrorMessageKey(error.code))` and the SDK's en-US `error.message` is **never** rendered in the DOM. Catalog keys live under `auth.errors.codes.*` (`invalid_credentials`, `email_not_verified`, `network_error`, `rate_limited`, …) with pseudo-locale parity in `messages/en-XA/auth.errors.json`. The default alert title falls back to `auth.errors.alertTitles.generic`. Tests: `src/components/ui/AuthErrorAlert.i18n.test.tsx` (real `NextIntlClientProvider`, en-US + en-XA), `src/components/ui/index.test.tsx` (closed-set fallback), `src/lib/errors/errors.test.ts` (re-export contract).

`getAuthErrorMessageKey` is closed-set: it always returns a stable identifier from `AUTH_ERROR_MESSAGE_KEYS` (or `"unknown_error"` for any unrecognized code), so a hostile upstream `error.code` cannot escape the `auth.errors.codes` namespace or leak free-form text into the rendered DOM.

### Pseudo-locale generation

```bash
pnpm generate:pseudo
```

Walks every `messages/en-US/auth.*.json` (skipping `*.meta.json`) and emits `messages/en-XA/auth.*.json` via `pseudoLocalizeMessage` from `@xynes/i18n`. ICU placeholders are preserved.

Test the pseudo-locale in a browser:

```bash
# Set the cookie, then load any auth surface.
document.cookie = "xynes_locale=en-XA; path=/";
```

### Test harness

- A global `next-intl` mock in `src/test/setup.ts` resolves keys against the real en-US catalogs so existing tests keep their canonical English assertions.
- For pseudo-locale rendering tests, `vi.unmock("next-intl")` and wrap the component in a real `NextIntlClientProvider` (see `src/components/auth/forms/LoginForm.i18n.test.tsx` and `src/components/workspace/WorkspaceSelector.i18n.test.tsx`).
- Catalog parity / fail-closed coverage: `src/i18n/config.test.ts`.

### Security invariants

- Locale resolution always passes through `negotiateLocale` from `@xynes/i18n` — no untrusted string ever drives a filesystem or import path.
- Catalogs MUST NOT contain raw secrets, tokens, hashes, or API key markers. Asserted by `src/i18n/config.test.ts` (`xynes_live_`, `key_hash`, `access[_-]?token`, `api[_-]?key`).
- `getOAuthErrorMessageKey` returns a closed-set enum; provider-supplied descriptions are never echoed.
- Translated copy is rendered via `useTranslations` (text node only) — never via `dangerouslySetInnerHTML`.
- The forgot-password `successMessage` is account-enumeration safe in every locale (sidecar guidance pinned).

### Known follow-ups

- ~~`feat(auth-sdk): localize SDK error messages`~~ — **Closed by TFU-2 on 2026-05-09.** `@xynes/auth-sdk` now exports `getAuthErrorMessageKey` + `AUTH_ERROR_MESSAGE_KEYS` (closed-set), and `<AuthErrorAlert>` resolves the body via `auth.errors.codes.<key>` instead of the SDK's en-US `error.message`.
- `chore(reset-password): localize debug panel` — The dev-only debug panel in `src/app/reset-password/page.tsx` is intentionally left in English (developer surface, not pilot scope).
- `feat(i18n): locale-switcher UI` — The cookie-based locale negotiation works today, but there is no in-product UI to toggle locales. Add when pilot graduates.

### Self-Invite + Already-Member Guards on Invite Create (BUG-AUTH-8, 2026-06-01)

- `CreateInviteForm` now surfaces two new closed-set backend rejections with localized, actionable copy:
  - **SELF_INVITE** (HTTP 400): the inviter tried to invite their own email address. Backend guard at `xynes-accounts-service/src/actions/handlers/invites/create.ts` compares the normalized invitee email against `ctx.user.email` (set by the gateway from the user JWT) and falls back to an `identity.users` lookup by `ctx.userId` when the gateway did not propagate the email. UI copy: `auth.invite.create.errors.selfInvite` → "You cannot invite yourself."
  - **ALREADY_MEMBER** (HTTP 400): the invited address already has an `active` membership in the workspace. Backend guard runs a single inner join of `platform.workspace_members` against `identity.users.email` (workspace-scoped, status=`active`). UI copy: `auth.invite.create.errors.alreadyMember` → "This person is already a workspace member."
- Both guards run BEFORE the invite token is generated and BEFORE the `platform.workspace_invites` insert fires. Defense in depth: SELF_INVITE fires before the membership check (no extra DB cost on the self-invite path), and the membership-check query selects only `userId` — never the existing member's email or display name.
- The form reads the structured `error.code` from the SDK's thrown envelope (`{ ok: false, error: { code, message }, meta }`) via a defensive `extractApiErrorCode` helper. Backend message text is NEVER echoed into the UI — only the closed-set code is consumed, and a hostile `error.code: "boom"` (or any non-allowlisted value) falls through to the generic "Failed to create invite. Please try again." copy.
- i18n: new keys `auth.invite.create.errors.{selfInvite,alreadyMember}` registered in `messages/en-US/auth.invite.json` + the meta sidecar; pseudo-locale regenerated via `pnpm generate:pseudo`. The rest of `CreateInviteForm`'s static strings remain hard-coded English — a full next-intl migration of the form is a separate follow-up.
- Regression coverage: 4 new tests in `CreateInviteForm.integration.test.tsx` (SELF_INVITE localized copy + no-leak of backend message; ALREADY_MEMBER localized copy; FORBIDDEN closed-set code + no-leak of backend `"Access denied"`; unknown-code fallback + no-leak of backend `"boom"`). Backend coverage: 3 new tests in `xynes-accounts-service/tests/invites.unit.test.ts` (SELF_INVITE via `ctx.user.email`; SELF_INVITE via users-table fallback when `ctx.user` is missing; ALREADY_MEMBER + no-leak of the existing member's userId in the error message).
