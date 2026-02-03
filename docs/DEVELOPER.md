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
- `/logout`
	- Must always return to the auth app `/login` (never default to CMS).
	- Any preserved `redirect` must be validated/allowlisted.
	- Server-side redirects require absolute URLs; compute the origin safely (prefer configured public auth URL; else allowlisted `x-forwarded-*`/`Host`).
- `/workspaces`
	- Only redirect externally when an explicit, validated `redirect` query param is present.
	- If no `redirect` is provided, selecting a workspace must stay within the auth app and show an in-app confirmation page (`/workspaces/selected`).
	- Selection UI must prevent rage-clicking/multi-select races via an immediate local lock + visible loading state.

Feature-level details:
- `docs/features/logout-flow.md`
- `docs/features/auth-workspace-selector.md`

## Feature Flags

### Source of Truth
- Remote flags come from the gateway `/flags` endpoint via `FeatureFlagsProvider`.
- Flags are normalized to SDK keys (e.g., `enableOAuthGitHub` → `xynes_auth_oauth_github`).

### Deterministic Overrides (Local)
Use env overrides to unblock QA and ensure deterministic UI:
- `NEXT_PUBLIC_ENABLE_OAUTH_GOOGLE`
- `NEXT_PUBLIC_ENABLE_OAUTH_GITHUB`
- `NEXT_PUBLIC_ENABLE_OAUTH_APPLE`
- `NEXT_PUBLIC_FEATURE_FLAGS_OVERRIDE` (JSON; gateway or SDK keys)

Overrides always win over remote values.

## Folder Structure Standards

```
src/
├── app/                # Next.js routes, layouts, providers
├── components/         # React UI components (Tier 2)
├── lib/                # Pure utilities & SDK re-exports (Tier 1)
└── test/               # Shared test utilities
```

Rules:
- Tier 1 logic lives under `src/lib/*` and must be unit tested.
- Tier 2 components live under `src/components/*` with integration tests.
- Avoid mixing React components into `src/lib`.

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
