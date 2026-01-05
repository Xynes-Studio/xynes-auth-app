# Xynes Auth App

Dedicated authentication application for the Xynes platform. Handles all auth flows including signup, login, password reset, and email verification.

## Overview

This is a Next.js 15 application that serves as the centralized authentication hub for all Xynes services:

- **URL**: `auth.xynes.com`
- **Purpose**: Handle all authentication flows
- **Integration**: Uses `@xynes/auth-sdk` for shared auth utilities

## Features

### Story 1: New User Sign Up (AUTH-FE-1.1) ✅

- [x] Email/password signup with validation
- [x] Google OAuth signup
- [x] GitHub OAuth signup
- [x] Real-time password strength indicator
- [x] Email verification flow
- [x] Loading states and error handling
- [x] Redirect handling (safe redirects only)

### Story 2: Login Page (AUTH-FE-1.4) ✅

- [x] Email/password login with validation
- [x] Google OAuth login
- [x] GitHub OAuth login  
- [x] Loading states during submission
- [x] Error display (invalid credentials, network errors)
- [x] "Forgot password" link navigation
- [x] Redirect to `?redirect=` param or default route
- [x] Form accessibility (labels, focus, keyboard nav)
- [x] 99% test coverage

### Story 3: OAuth Login with Feature Flags (AUTH-FE-1.5) ✅

- [x] Dynamic feature flags integration via `@xynes/auth-sdk`
- [x] Backend-driven OAuth provider configuration
- [x] Google OAuth conditional rendering
- [x] GitHub OAuth conditional rendering
- [x] `FeatureFlagsProvider` integration
- [x] `useOAuthProviders()` hook usage
- [x] Test utilities for provider mocking

### Story 4: OAuth Callback Handler (AUTH-FE-1.6) ✅

- [x] `/callback` route extracts tokens from URL
- [x] Supabase session established from OAuth tokens
- [x] `GET /me` called to bootstrap user in accounts service
- [x] Smart redirect logic based on user state:
  - New user (no workspaces) → `/onboarding`
  - Existing user (has workspaces) → `/workspaces`
  - Custom `?redirect=` param → validated external URL
- [x] OAuth provider error handling (access_denied, invalid_request, etc.)
- [x] User-friendly error messages on login page
- [x] Pure function extraction for testability (ADR-001 compliant)
- [x] 91.4% test coverage

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Supabase instance (self-hosted or cloud)

### Environment Setup

Create a `.env` file:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://84.247.176.134:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# API Gateway
NEXT_PUBLIC_API_URL=http://localhost:4100

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3100
```

### Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Running with Docker

The app can be run via Docker Compose from the `/infra` directory:

```bash
cd /infra
./run.sh dev      # Development mode
./run.sh up       # Production mode
./run.sh down     # Stop all services
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── signup/            # Signup flow
│   │   └── page.tsx       # Email verification handling
│   ├── login/             # Login flow
│   │   ├── page.tsx       # Login page with OAuth & email
│   │   └── page.test.tsx  # Page integration tests
│   ├── callback/          # OAuth callback handling
│   │   ├── route.ts       # OAuth callback route handler
│   │   └── route.test.ts  # Route integration tests (Tier 2)
│   ├── providers.tsx      # App-level providers (FeatureFlagsProvider)
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── SignupForm.tsx     # Main signup form component
│   ├── LoginForm.tsx      # Main login form component
│   ├── LoginForm.test.tsx # Login form unit tests
│   └── ui/                # Shared UI components
│       ├── OAuthButtons.tsx     # Reusable OAuth buttons
│       ├── AuthDivider.tsx      # Divider component
│       ├── AuthErrorAlert.tsx   # Error alert component
│       ├── index.ts             # Barrel exports
│       └── index.test.tsx       # UI component tests
├── lib/                   # Utilities and configuration
│   ├── supabase/          # Supabase client setup
│   ├── oauth/             # OAuth utilities (Tier 1 pure functions)
│   │   ├── callback-utils.ts    # Bootstrap & redirect logic
│   │   ├── callback-utils.test.ts # Unit tests
│   │   ├── errors.ts            # OAuth error messages
│   │   ├── errors.test.ts       # Unit tests
│   │   └── index.ts             # Barrel exports
│   ├── validation/        # Re-exports from @xynes/auth-sdk
│   ├── errors/            # Re-exports from @xynes/auth-sdk
│   └── redirect/          # Re-exports from @xynes/auth-sdk
└── test/                  # Test utilities
    └── test-utils.tsx     # Custom render with providers
```

### App Providers

The app uses `FeatureFlagsProvider` from `@xynes/auth-sdk` to dynamically fetch feature flags from the backend:

```tsx
"use client";

// src/app/providers.tsx
import { FeatureFlagsProvider } from "@xynes/auth-sdk";

export function Providers({ children }: { children: React.ReactNode }) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4100";

  return (
    <FeatureFlagsProvider apiBaseUrl={apiBaseUrl} fetchOnMount={true}>
      {children}
    </FeatureFlagsProvider>
  );
}
```

### Using Feature Flags in Components

```tsx
// In any component
import { useOAuthProviders } from "@xynes/auth-sdk";

export function LoginForm() {
  const oauthProviders = useOAuthProviders();
  // { google: true/false, github: true/false, apple: true/false }
  
  return (
    <OAuthButtons providers={oauthProviders} />
  );
}
```

### Utility Re-exports

All validation, error handling, and redirect utilities are imported from `@xynes/auth-sdk` via barrel exports:

```typescript
// In auth-app components
import { validateEmail, validatePassword } from "@/lib/validation";
import { normalizeAuthError } from "@/lib/errors";
import { getSafeRedirectUrl } from "@/lib/redirect";
```

This pattern ensures:
- Single source of truth (SDK)
- No code duplication
- Easier updates and maintenance

## Testing

Following ADR-001 testing standards with 80%+ coverage target.

```bash
# Run tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run linting
pnpm lint
```

### Test Utilities

Use `renderWithProviders` for components that need context providers:

```tsx
import { renderWithProviders, mockFeatureFlags } from "@/test/test-utils";

describe("LoginForm", () => {
  it("renders OAuth buttons when enabled", () => {
    renderWithProviders(<LoginForm />, {
      flags: {
        ...mockFeatureFlags,
        xynes_auth_oauth_google: true,
        xynes_auth_oauth_github: true,
      },
    });
    
    expect(screen.getByText("Continue with Google")).toBeInTheDocument();
  });
});
```

### Current Coverage

| File | Coverage |
|------|----------|
| SignupForm.tsx | 96.86% |
| LoginForm.tsx | 99%+ |
| lib/validation | 100% |
| lib/errors | 100% |
| lib/redirect | 74.32% |
| lib/oauth | 98.66% |
| **Overall** | **91.4%** |

## OAuth Configuration

### Google OAuth

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Add authorized redirect URI: `{SUPABASE_URL}/auth/v1/callback`
3. Configure in Supabase Auth settings

### GitHub OAuth

1. Create OAuth App in [GitHub Developer Settings](https://github.com/settings/developers)
2. Add callback URL: `{SUPABASE_URL}/auth/v1/callback`
3. Configure in Supabase Auth settings

## Related Documentation

- [Auth SDK](../xynes-auth-sdk/README.md) - Shared auth utilities
- [ADR-001 Testing Standards](../lumia-ds/docs/ADR-001-testing-standards.md)
- [Docker Infrastructure](../infra/README.md)

## License

MIT
