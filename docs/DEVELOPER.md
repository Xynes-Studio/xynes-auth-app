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

### Components

- `src/lib/integrations/workspace-integrations-client.ts` — typed gateway client (Task 1, landed 2026-05-05). Exposes `listWorkspaceDomains`, `registerWorkspaceDomain`, `verifyWorkspaceDomain`, `deleteWorkspaceDomain`, `listWorkspaceApiKeys`, `createWorkspaceApiKey`, `revokeWorkspaceApiKey`, and `WorkspaceIntegrationsApiError`. All payloads are normalised through allowlists so server-side secrets (`keyHash`, `verificationValueHash`, `internalAuditNote`, `rawKey` outside the create flow) cannot leak into UI state.
- `src/lib/integrations/workspace-integrations-types.ts` — shared types + `WORKSPACE_API_KEY_PRESET_KEYS` (`cms_readonly`, `cms_authoring`, `cms_publisher`, `telemetry_read`, `workspace_admin`). Mirror of `WORKSPACE_API_KEY_PRESETS` in `xynes-accounts-service`.
- `src/app/dashboard/integrations/page.tsx` — thin client page wired through `AuthGuard` + `AuthDashboardShell` with `activeNav="integrations"`.
- `src/app/dashboard/integrations/components/WorkspaceIntegrationsDashboard.tsx` — container (Task 2, landed 2026-05-05). Owns data fetching for both lists, surfaces active workspace context, and renders accessible loading / error / empty / no-workspace states. Per-row rendering and lifecycle actions live in `DomainManagementPanel` (Task 3) and `ApiKeyManagementPanel` (Task 4).
- `src/app/dashboard/integrations/components/DomainManagementPanel.tsx` — verified-domain lifecycle UI (Task 3, landed 2026-05-05). Renders the domain list, registration form, DNS-TXT verification action, and soft-delete confirmation with Lumia DS primitives. It keeps the one-time `verificationValue` local to the panel reveal state, never renders hash/internal audit fields, preserves typed input on failed registration, and exposes loading/error/empty/permission states through accessible status regions and labels.
- `src/app/dashboard/integrations/components/ApiKeyManagementPanel.tsx` — workspace API key lifecycle UI (Task 4, landed 2026-05-08). Renders the API key list (name, prefix, status pill, preset label, last used, expiry), the create-key form (Name input + Preset `Select`), and the revoke confirmation flow with Lumia DS primitives. The one-time raw key (`xynes_live_<hex>`) is held in container state ONLY (`pendingRawApiKey`) and forwarded to the panel via prop; the panel renders it exactly once inside an `InlineAlert` (`role="status"`, `aria-live="polite"`) with the warning copy "You won't see this key again", a single "Dismiss API key" button, and never copies it into any other state. Status pill mapping uses Lumia's `success | warning | error | info` variants only (`active`→success, `expired`→warning, `revoked`→error). Revoked and expired keys correctly do NOT render a Revoke button. The destructive Revoke action is gated by Lumia `ConfirmDialog` (a real focus-trapped `alertdialog`). Preset labels follow `WORKSPACE_API_KEY_PRESET_KEYS` (`CMS Read-only`, `CMS Authoring`, `CMS Publisher`, `Telemetry Read`, `Workspace Admin`).

### Deep-link contract (Task 5, landed 2026-05-08)

The `/dashboard/integrations` page honors deep-link query parameters from CMS console links built by `xynes-front-end/xynes-cms-console-web/src/features/integrations/workspace-admin-links.ts`:

- `?tab=domains` — moves keyboard focus to the "Verified domains" heading on first load so screen-reader and keyboard users land on the relevant section without scrolling. The heading carries `tabIndex={-1}` so it is programmatically focusable but not part of the natural tab order.
- `?tab=api-keys` — same focus contract for the "Workspace API keys" heading.
- `?preset=cms_readonly` or `?preset=cms_publisher` — pre-selects the matching option in the create-API-key form's Preset `Select`. Only the values in the local allowlist (validated against `WORKSPACE_API_KEY_PRESET_KEYS`) are honored; unknown / hostile values are silently ignored and the default `cms_readonly` is preserved.

Both parameters can be combined: CMS uses targets `cms_readonly_key` (`?tab=api-keys&preset=cms_readonly`) and `cms_publisher_key` (`?tab=api-keys&preset=cms_publisher`).

The container uses `useSearchParams()` (from `next/navigation`), so `page.tsx` wraps the container in a `<Suspense>` boundary with a `Spinner` fallback — required by Next.js 15 for client-side search-params reads during static prerender.

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
