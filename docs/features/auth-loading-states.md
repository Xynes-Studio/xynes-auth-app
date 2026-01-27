# Auth Loading States (AUTH-FE-1.8)

> **Status:** Implemented  
> **Last Updated:** 2026-01-06  
> **Related:** ADR-001 Testing Standards

## Overview

This module provides accessible loading states for authentication operations in the auth system. It follows the three-tier testing architecture from ADR-001 and integrates with the `@lumia-ui/components` design system.

## Architecture

### Pure Utilities (SDK) - Tier 1

Located in `@xynes/auth-sdk/src/utils/loading.ts`:

```typescript
import {
  createLoadingState,
  createIdleState,
  isLoadingActive,
  requiresFullPageLoading,
  getLoadingAnnouncement,
  mergeLoadingStates,
  getButtonLoadingText,
  LOADING_STATES,
  BUTTON_LOADING_TEXT,
} from '@xynes/auth-sdk';
```

### React Components (Auth App) - Tier 2

Located in `xynes-auth-app/src/components/ui/loading/`:

| Component | Purpose | Use Case |
|-----------|---------|----------|
| `AuthPageSkeleton` | Full-page skeleton | Initial auth check |
| `AuthLoadingOverlay` | Full-page overlay with spinner | Sign out, redirect |
| `InlineLoadingIndicator` | Inline spinner | Field validation |
| `LoadingTransition` | Smooth transition wrapper | Prevent flash of wrong content |
| `AuthCheckingState` | Minimal centered spinner | Full-page auth-check loader |

## Usage

The auth app uses `AuthPageSkeleton` as the `Suspense` fallback for initial route loading on:
- `src/app/login/page.tsx`
- `src/app/signup/page.tsx`
- `src/app/logout/page.tsx`

### Full-Page Loading (Initial Auth Check)

```tsx
import { AuthPageSkeleton } from '@/components/ui/loading';

function AuthenticatedPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <AuthPageSkeleton title="Checking authentication" />;
  }

  return <PageContent />;
}
```

### Loading Overlay (Sign Out)

```tsx
import { AuthLoadingOverlay } from '@/components/ui/loading';

function LogoutPage() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  return (
    <AuthLoadingOverlay isVisible={isSigningOut} message="Signing out...">
      <PageContent />
    </AuthLoadingOverlay>
  );
}
```

### Button Loading States

```tsx
import { Button } from '@lumia-ui/components';
import { getButtonLoadingText } from '@xynes/auth-sdk';

<Button
  type="submit"
  isLoading={isSubmitting}
  loadingText={getButtonLoadingText('signIn')}
>
  Sign in
</Button>
```

### Inline Validation Loading

```tsx
import { InlineLoadingIndicator } from '@/components/ui/loading';

<div className="flex items-center gap-2">
  <input {...props} />
  <InlineLoadingIndicator 
    isLoading={isValidating} 
    message="Checking availability" 
  />
</div>
```

### Smooth Transitions (Prevent Flash)

```tsx
import { LoadingTransition, AuthPageSkeleton } from '@/components/ui/loading';

<LoadingTransition
  isLoading={isAuthenticating}
  loadingContent={<AuthPageSkeleton />}
  minLoadingTime={300}
>
  <AuthenticatedContent />
</LoadingTransition>
```

## Loading State Types

```typescript
type LoadingStateType =
  | 'idle'           // Not loading
  | 'authenticating' // Initial auth check (full-page)
  | 'signing-up'     // Creating account (inline)
  | 'signing-out'    // Sign out (full-page)
  | 'validating'     // Field validation (inline)
  | 'submitting'     // Form submission (inline)
  | 'redirecting';   // Redirect in progress (full-page)
```

## Accessibility

All components follow WCAG 2.1 AA guidelines:

- **`role="status"`**: Identifies loading regions
- **`aria-busy="true"`**: Indicates loading state
- **`aria-label`**: Describes the loading operation
- **`aria-live="polite/assertive"`**: Announces state changes to screen readers
- **`.sr-only`**: Screen reader-only announcements

## Testing

### Unit Tests (Tier 1) - 100% Coverage Target

```bash
# SDK loading utilities
cd xynes-auth-sdk && pnpm test src/utils/loading.test.ts
```

### Integration Tests (Tier 2) - 80% Coverage Target

```bash
# Auth app components
cd xynes-auth-app && pnpm test src/components/ui/loading/
```

## File Structure

```
xynes-auth-sdk/
└── src/
    └── utils/
        ├── loading.ts           # Pure loading utilities
        └── loading.test.ts      # Unit tests

xynes-auth-app/
└── src/
    └── components/
        └── ui/
            └── loading/
                ├── index.ts                      # Module exports
                ├── AuthLoadingStates.tsx         # React components
                └── AuthLoadingStates.test.tsx    # Integration tests
```

## Acceptance Criteria Checklist

- [x] Full-page skeleton during initial auth check
- [x] Button spinners during form submission (via `@lumia-ui/components`)
- [x] Inline loading states for async validation
- [x] Smooth transitions (no flash of wrong content)
- [x] Accessible loading announcements (aria-live)
- [x] Unit tests (80%+ coverage)
- [x] Integration tests for React components

## Dependencies

- `@lumia-ui/components`: Skeleton, Spinner components
- `@xynes/auth-sdk`: Loading utilities
- React 18+, Next.js 14+

## Related Documentation

- [ADR-001: Testing Standards](../../lumia-ds/docs/ADR-001-testing-standards.md)
- [Skeleton Component](../../lumia-ds/docs/components-skeleton.md)
- [FRONTEND-STORIES.md](../../infra/docs/FRONTEND-STORIES.md)
