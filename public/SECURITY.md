# Security Policy — `xynes-auth-app`

The xynes-auth-app is the centralized authentication application for the Xynes platform (`auth.xynes.com`). It handles every login, signup, OAuth callback, and password-reset flow across the platform — meaning a vulnerability here is a vulnerability for every Xynes workspace and console downstream. We take security reports seriously and respond within the disclosure timeline below.

## Reporting a vulnerability

**Please email `security@xynes.com`** with:

- A short, plain-text description of the issue.
- Reproduction steps. Include the affected URL(s), HTTP requests, headers, and any payload you used. Curl or a request capture is fine.
- Your assessment of impact.
- Whether you would like public credit. We default to crediting reporters in the release notes unless you ask us not to.

For sensitive reports, you may PGP-encrypt the email body. Our PGP key fingerprint is published at `https://xynes.com/.well-known/security.txt` (see `Encryption:` field).

**Please do not** open public GitHub issues for security reports, post in support channels, or share the reproduction steps with other parties before we have shipped a fix.

## What is in scope

- The auth-app codebase at `xynes-front-end/xynes-auth-app`.
- The `auth.xynes.com` production deployment and its public routes (`/login`, `/signup`, `/forgot-password`, `/reset-password`, `/callback`, `/callback/client`, `/onboarding`, `/dashboard/*`, `/invite/*`, `/workspaces`, `/`, `/SECURITY.md`).
- Cross-app handoff with `cms.xynes.com` and any other published Xynes consumer of `@xynes/auth-sdk`, **only** through the documented redirect-allowlist contract.

## What is out of scope

- Self-hosted forks running outside of `xynes.com` infrastructure.
- Findings that require a logged-in attacker to compromise their own account.
- Generic best-practice findings without a concrete exploit path (e.g. "you should add `X-Frame-Options`" — the platform already sends `frame-ancestors 'none'` via CSP).
- Findings against third-party providers (Supabase, GitHub OAuth, Google OAuth). Please report those upstream.
- Denial-of-service via rate-limiting bypass. We document rate-limits at the gateway and treat their internals as Xynes-internal.

## Supported versions

The auth-app does not ship versioned releases; the `main` / `develop` branches and the production deployment are the supported surface.

| Version line          | Supported |
| --------------------- | --------- |
| `develop` (latest)    | ✅        |
| Production deployment | ✅        |
| Old release tags      | ❌        |

## Response timeline

We aim for the following timeline. The clock starts when we acknowledge receipt of the report at `security@xynes.com`.

| Severity                 | Acknowledgement | Triage decision | Public disclosure window |
| ------------------------ | --------------- | --------------- | ------------------------ |
| Critical (P0)            | 24 h            | 72 h            | 30 days after fix shipped |
| High (P1)                | 72 h            | 7 days          | 60 days after fix shipped |
| Medium / Low             | 7 days          | 14 days         | 90 days after fix shipped |

If a fix takes longer than the public-disclosure window, we will coordinate with you before publishing.

## What you can expect from us

- A response from a human within the acknowledgement window above.
- A triage decision within the triage window. If we cannot reproduce the issue, we will say so and ask for clarification.
- Credit in the release notes, unless you ask us not to.
- A clear statement of the fix shipped, including the commit hash and the deployment date.

## Hall of fame

Reporters who have responsibly disclosed an issue are listed at <https://xynes.com/security/hall-of-fame>. (Empty at MVP — be the first.)
