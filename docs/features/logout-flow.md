# Logout Flow - Developer Documentation

> **Story:** AUTH-FE-1.7  
> **Status:** Complete  
> **Last Updated:** 2026-01-06

## Overview

The logout flow provides secure session termination for authenticated users. It supports both server-side route handler (for form submissions and redirects from consumer apps) and client-side page (for visual feedback during logout).

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOGOUT FLOW ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

    Consumer App (cms.xynes.com)              Auth App (auth.xynes.com)
    ─────────────────────────────             ───────────────────────────
              │                                          │
              │  User clicks "Sign Out"                  │
              │─────────────────────────────────────────▶│
              │  GET/POST /logout?redirect=cms.xynes.com │
              │                                          │
              │                                          │  1. Supabase signOut()
              │                                          │  2. Clear httpOnly cookies
              │                                          │  3. Validate redirect URL
              │                                          │
              │◀─────────────────────────────────────────│
              │  307 Redirect to /login                  │
              │  (with ?redirect= for login flow)        │
              │                                          │
```

## File Structure

```text
src/
├── app/logout/
│   ├── route.ts        # Server-side logout handler (POST/GET)
│   ├── route.test.ts   # Route handler tests (Tier 2)
│   ├── page.tsx        # Client-side logout page with UI
│   └── page.test.tsx   # Page component tests (Tier 2)
│
└── lib/logout/
    ├── index.ts            # Barrel export
    ├── logout-utils.ts     # Pure utility functions (Tier 1)
    └── logout-utils.test.ts # Utility tests (Tier 1)
```

## Usage

### From Consumer Apps (Recommended)

Redirect users to the auth app logout route:

```typescript
// In consumer app (e.g., cms.xynes.com)
function handleLogout() {
  const authAppUrl = process.env.NEXT_PUBLIC_AUTH_APP_URL;
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.href = `${authAppUrl}/logout?redirect=${returnUrl}`;
}
```

### Direct API Call

```typescript
// POST request (CSRF-safe, preferred)
await fetch('/logout', { method: 'POST' });

// GET request (supports browser navigation)
window.location.href = '/logout?redirect=https://cms.xynes.com';
```

### Using the SDK (Future)

```typescript
import { useAuth } from '@xynes/auth-sdk';

function LogoutButton() {
  const { signOut, redirectToLogin } = useAuth();
  
  const handleLogout = async () => {
    await signOut();
    redirectToLogin();
  };
  
  return <button onClick={handleLogout}>Sign Out</button>;
}
```

## API Reference

### Route Handler (`/logout`)

| Method | Description |
|--------|-------------|
| `GET`  | Logout via direct navigation/redirect |
| `POST` | Logout via form submission (CSRF-safe) |

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `redirect` | `string` | Optional. URL to redirect to after logout. Must be in allowed domains. |

**Response:**

| Status | Description |
|--------|-------------|
| `307` | Redirect to login page or specified redirect URL |

> **Note:** `NextResponse.redirect()` uses HTTP 307 (Temporary Redirect) by default,
> which preserves the request method. This matches the test expectations in `route.test.ts`.

### Utilities (`@/lib/logout`)

#### `buildLogoutRedirectUrl(authAppUrl, postLogoutRedirect?)`

Builds the complete logout redirect URL for consumer apps.

```typescript
import { buildLogoutRedirectUrl } from '@/lib/logout';

const url = buildLogoutRedirectUrl(
  'https://auth.xynes.com',
  'https://cms.xynes.com/dashboard'
);
// => 'https://auth.xynes.com/login?redirect=https%3A%2F%2Fcms.xynes.com%2Fdashboard'
```

#### `getPostLogoutRedirectUrl(redirectUrl, defaultUrl, allowedDomains)`

Validates and returns a safe redirect URL.

```typescript
import { getPostLogoutRedirectUrl } from '@/lib/logout';

const safeUrl = getPostLogoutRedirectUrl(
  userProvidedUrl,
  '/login',
  ['xynes.com', 'localhost:3000']
);
```

#### `getCookieClearingOptions(cookieDomain)`

Returns secure cookie options for clearing auth cookies.

```typescript
import { getCookieClearingOptions } from '@/lib/logout';

const options = getCookieClearingOptions('.xynes.com');
// => { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 0, ... }
```

#### `getSupabaseCookieNames(cookieNames)`

Filters cookie names to find Supabase auth cookies.

```typescript
import { getSupabaseCookieNames } from '@/lib/logout';

const authCookies = getSupabaseCookieNames(['sb-auth-token', 'theme', 'sb-refresh']);
// => ['sb-auth-token', 'sb-refresh']
```

## Security Measures

### 1. Open Redirect Prevention

All redirect URLs are validated against an allowlist:

```typescript
const ALLOWED_DOMAINS = ['xynes.com', 'localhost:3000'];
```

Invalid redirects fall back to `/login`.

### 2. httpOnly Cookie Clearing

Authentication cookies are cleared server-side:

```typescript
// Cookies are httpOnly - cannot be accessed by client-side JavaScript
cookieStore.delete(cookieName);
```

### 3. CSRF Protection

The POST endpoint is preferred for logout as it:
- Allows CSRF token validation
- Won't be triggered by prefetching or link preloading

### 4. Graceful Error Handling

Errors during logout don't expose sensitive information:
- Supabase errors are logged but don't fail the logout
- Cookie clearing errors are handled individually
- Users are always redirected (even on errors)

## Testing

### Test Tiers

Following ADR-001 testing standards:

| Tier | File | Coverage |
|------|------|----------|
| 1 | `logout-utils.test.ts` | 96%+ (pure functions) |
| 2 | `route.test.ts` | Integration tests |
| 2 | `page.test.tsx` | Component integration |

### Running Tests

```bash
# Run all logout tests
pnpm test src/lib/logout src/app/logout

# Run with coverage
pnpm test --coverage src/lib/logout src/app/logout
```

### Test Coverage

- **50 tests total**
- **96%+ coverage** on logout-specific code

## Accessibility

The logout page follows WCAG 2.1 AA guidelines:

- ✅ Semantic heading structure (`h1`)
- ✅ ARIA busy state during loading (`aria-busy="true"`)
- ✅ Keyboard-accessible retry button
- ✅ Clear error messaging with Alert component
- ✅ Color contrast meets WCAG AA

## Dependencies

| Package | Purpose |
|---------|---------|
| `@lumia-ui/components` | UI components (Card, Button, Spinner, Alert) |
| `@supabase/ssr` | Server-side Supabase client |
| `next/headers` | Cookie access in route handlers |

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Optional - defaults to 'xynes.com,localhost:3000'
NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS=xynes.com,localhost:3000
```

## Related Documentation

- [FRONTEND-STORIES.md](/infra/docs/FRONTEND-STORIES.md) - Story requirements
- [ADR-001 Testing Standards](/lumia-ds/docs/ADR-001-testing-standards.md)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth)
