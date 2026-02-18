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
│   │   └── guards/      # Auth flow guards (e.g., profile completion)
│   │   ├── navigation/  # Auth route navigation primitives
│   │   └── layout/      # Shared auth entry layout + visuals
├── lib/                # Pure utilities & SDK re-exports (Tier 1)
│   └── profile/         # Profile/me bootstrap API utilities
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
- Do not log tokens or PII.
- Enforce feature flags defensively (UI + backend checks).

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
- Workspace slug must be validated/sanitized before URL composition.
- New-tab launches must use `noopener,noreferrer`.

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

## Linting

- Always run `pnpm lint` before PR or handoff.
