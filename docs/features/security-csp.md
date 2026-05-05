# Content Security Policy (CSP) Setup

**Feature:** SEC-FE-1.5  
**Status:** `COMPLETE`  
**Priority:** P0

## Overview

We have implemented a strict Content Security Policy (CSP) and additional security headers to mitigate Cross-Site Scripting (XSS), Clickjacking, and other code injection attacks. The implementation uses a hybrid approach with Next.js Middleware for dynamic nonces and `next.config.mjs` for static security headers.

## Architecture

### 1. Dynamic CSP Generation (Middleware)

Located in `src/middleware.ts`.

- **Nonce Generation:** A unique `base64` nonce is generated for every request using `crypto.randomUUID()`.
- **Directives:**
  - `default-src 'self'`: Fallback for everything else.
  - `script-src`: strict `nonce-{random}` based allowance. Trusted domains: `cdn.supabase.io`.
  - `style-src`: `'self' 'unsafe-inline'` allowed for UI libraries.
  - `img-src`: `'self' data: https:`.
  - `connect-src`: `'self'`, Supabase API, and Xynes API.
  - `frame-ancestors 'none'`: Prevents embedding in iframes (Anti-Clickjacking).
  - `report-uri`: Violations are reported to `/api/csp-report`.

### 2. Static Security Headers

Located in `next.config.mjs`.

- **X-Frame-Options:** `DENY`
- **X-Content-Type-Options:** `nosniff`
- **Referrer-Policy:** `strict-origin-when-cross-origin`
- **Permissions-Policy:** explicitly disables access to sensitive features like camera, microphone, etc.

### 3. Violation Reporting

Located in `src/app/api/csp-report/route.ts`.

A dedicated API route handles CSP violation reports sent by browsers. Currently logs to console, but can be extended to send to external monitoring services (e.g., Sentry).

## Usage

The CSP is automatically applied to all routes except static assets (`_next/static`, images, etc.).

### Consuming the Nonce

The nonce is passed to the client via:
1. `x-nonce` request header (internally used by Server Components).
2. `<meta name="csp-nonce" content="..." />` (if needed for client-side scripts, though usually handled by Next.js automatically for scripts).

## Testing

A unit test suite `src/middleware.test.ts` verifies:
- Presence of strict CSP headers.
- Generation of unique nonces.
- Inclusion of necessary directives.
- Preservation of CSRF token logic.

## Resources

- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
