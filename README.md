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
│   ├── login/             # Login flow (future)
│   └── layout.tsx         # Root layout
├── components/            # React components
│   └── SignupForm.tsx     # Main signup form component
└── lib/                   # Utilities and configuration
    ├── supabase/          # Supabase client setup
    ├── validation/        # Re-exports from @xynes/auth-sdk
    ├── errors/            # Re-exports from @xynes/auth-sdk
    └── redirect/          # Re-exports from @xynes/auth-sdk
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

### Current Coverage

| File | Coverage |
|------|----------|
| SignupForm.tsx | 96.86% |
| lib/validation | 100% |
| lib/errors | 100% |
| lib/redirect | 100% |
| **Overall** | **86.57%** |

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
