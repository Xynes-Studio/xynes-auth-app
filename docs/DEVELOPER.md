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

## Testing Standards (ADR-001)

- Follow the three-tier testing architecture (Tier 1 = 100%, Tier 2 = 70%, Tier 3 = smoke).
- Overall coverage target: **80%** minimum.
- See [docs/TESTING.md](TESTING.md).

## Linting

- Always run `pnpm lint` before PR or handoff.
