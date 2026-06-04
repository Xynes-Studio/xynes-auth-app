# Auth-App Marketing Copy (LP-AUTH)

> **Owner:** `xynes-front-end/xynes-auth-app`
> **Surface:** `https://auth.xynes.com/` (the public landing page at `/`).
> **Plan reference:** [LP-AUTH §5](../../../infra/docs/plans/2026-06-04-landing-page-template/02-xynes-auth-app-landing.md).

This file is the **human-editable source of truth** for the landing-page copy. Non-engineers can review changes here via PR without touching JSX.

The same strings also live in `messages/en-US/auth.landing.json` (the i18n catalog `next-intl` reads at runtime) and are pseudo-localized into `messages/en-XA/auth.landing.json` by `pnpm generate:pseudo`. The two surfaces are kept in lockstep by `src/lib/landing-copy.ts` — see **§ Wire-up** below.

When this file changes, run `pnpm generate:pseudo` and update the JSON catalogs so the runtime + the source of truth stay aligned. The `landing-copy.test.ts` suite asserts catalog parity.

---

## § Brand voice

- Direct and confident. Avoid marketing fluff.
- Verbs over adjectives. "Sign in once" beats "Powerful sign-in capabilities".
- Concrete numbers when honest. Do NOT fabricate.
- Tone matches the rest of the auth-app surface (login form, dashboard) — not a separate marketing voice.

## § Hero

- **Headline:** "Xynes Workspace Admin"
- **Sub-head:** "Manage the people, access, domains, and API keys that connect your team’s Xynes apps."
- **Primary CTA:** "Sign in" → `/login`
- **Secondary CTA:** "Create an account" → `/signup`
- **Footnote:** "Session cookies only. No tracking cookies."

## § Features (3 cards)

### 1. One Workspace, Clear Access

- **Icon:** `shield-check`
- **Headline:** "One Workspace, Clear Access"
- **Body:** "Invite teammates, switch between workspaces, and keep permissions tied to the place where work actually happens."

### 2. A Doorway To Every Xynes App

- **Icon:** `globe`
- **Headline:** "A Doorway To Every Xynes App"
- **Body:** "Start in Workspace Admin, then move into CMS Console and future Xynes apps with the same account and workspace context."

### 3. Built In The Open

- **Icon:** `code`
- **Headline:** "Built In The Open"
- **Body:** "Review the auth app, SDK, and security policy in public repositories before your team depends on them."

## § Trust strip

- **Repo:** `https://github.com/Xynes-Studio/xynes-auth-app`
- **License:** `AGPL-3.0`
- **Security:** `/SECURITY.md`
- **Residency:** *(intentionally omitted until there is a canonical hosting-region source.)*

## § Footer columns

### Product

- **Sign in** → `/login`
- **Sign up** → `/signup`
- **Forgot password** → `/forgot-password`
- **CMS Console** → `NEXT_PUBLIC_CMS_CONSOLE_URL` when safe, otherwise local `http://localhost:3000` or production `https://cms.xynes.com` fallback

### Developers

- **auth-sdk on GitHub** → `https://github.com/Xynes-Studio/xynes-auth-sdk` *(external)*
- **Docs** → `https://docs.xynes.com` *(external)*

### Company

- **xynes.com** → `https://xynes.com` *(external)*
- **Status** → `https://status.xynes.com` *(external)*

### Legal

- **Privacy** → `https://xynes.com/legal/privacy` *(external)*
- **Terms** → `https://xynes.com/legal/terms` *(external)*
- **Cookies** → `https://xynes.com/legal/cookies` *(external)*
- **Security** → `/SECURITY.md`

## § Copyright

> © 2026 Xynes Studio. Built in the open.

## § Cookie disclosure

- **Body:** "We use a session cookie for sign-in. No tracking cookies."
- **Policy link label:** "Cookie policy" → `https://xynes.com/legal/cookies`
- **Dismiss label:** "Got it"

## § Wire-up

The page reads localized strings via `useTranslations('auth.landing')` from `next-intl`. The non-localized structural data (icon IDs, URLs, footer columns) lives in `src/lib/landing-copy.ts`, which is the bridge between this human-editable source and the JSX.

To change a URL or icon, edit `src/lib/landing-copy.ts`. To change visible text, edit `messages/en-US/auth.landing.json` AND this file in lockstep, then re-run `pnpm generate:pseudo`.

`src/lib/landing-copy.test.ts` enforces that this wiring (structure, URLs, allowlists) stays consistent.
