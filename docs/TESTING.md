# Testing Guide — xynes-auth-app

## Overview

This document outlines the testing standards and practices for the `xynes-auth-app` package. It follows the global testing ADR (ADR-001) with adaptations specific to the auth application.

## Three-Tier Testing Architecture

Following the global ADR, we implement a three-tier testing approach:

### Tier 1: Pure Function Tests (100% coverage target)

**Location:** `src/lib/*/` and utility modules

**Characteristics:**
- No React or DOM dependencies
- Fast, deterministic, easy to maintain
- Business logic, transformations, utilities

**Naming:** `*.test.ts`

**Current Tier 1 Modules:**
| Module | Coverage | Tests |
|--------|----------|-------|
| `lib/workspace/validation.ts` | 100% | 60 |
| `lib/logout/logout-utils.ts` | 100% | - |
| `lib/validation/index.ts` | 100% | - |

### Tier 2: Integration Tests (70% coverage target)

**Location:** `src/components/*/` and `src/app/*/`

**Characteristics:**
- Component interactions, hooks, forms
- Uses @testing-library/react
- Real DOM environment (happy-dom/Vitest)

**Naming:** `*.integration.test.tsx`

**Current Tier 2 Modules:**
| Component | Coverage | Tests |
|-----------|----------|-------|
| `CreateWorkspaceForm` | 96.25% | 21 |
| `LoginForm` | 100% | - |
| `SignupForm` | 96.87% | - |
| `OAuthButtons` | 97.24% | - |
| `AuthLoadingStates` | 100% | - |

### Tier 3: E2E/Smoke Tests (Smoke coverage)

**Not yet implemented for this package**

Future considerations:
- Storybook `play` functions
- Playwright for critical user flows

## File Organization

```
src/
├── lib/                    # Pure functions (Tier 1)
│   ├── workspace/
│   │   ├── validation.ts           # Pure validation logic
│   │   ├── validation.test.ts      # Unit tests
│   │   └── schemas.ts              # Zod schemas
│   └── ...
├── components/             # UI components (Tier 2)
│   ├── onboarding/
│   │   ├── CreateWorkspaceForm.tsx
│   │   └── CreateWorkspaceForm.integration.test.tsx
│   └── ...
├── app/                    # Next.js pages (Tier 2)
│   ├── onboarding/
│   │   └── page.tsx
│   └── ...
└── test/                   # Test utilities
    └── setup.ts            # Vitest setup
```

## Naming Conventions

| Test Type | Pattern | Example |
|-----------|---------|---------|
| Unit tests | `*.test.ts` | `validation.test.ts` |
| Integration | `*.integration.test.tsx` | `CreateWorkspaceForm.integration.test.tsx` |
| Interaction | `*.interaction.test.tsx` | (not yet used) |

## Running Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/lib/workspace/validation.test.ts

# Watch mode
pnpm test:watch
```

## Coverage Targets

| Tier | Target | Current |
|------|--------|---------|
| Tier 1 (Pure) | 100% | 100% |
| Tier 2 (Integration) | 70% | 96%+ |
| Tier 3 (E2E) | Smoke | N/A |
| **Overall** | **80%** | **94.8%** |

## Test Setup

### Environment Variables

Tests require specific environment variables, defined in `src/test/setup.ts`:

```typescript
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.NEXT_PUBLIC_API_URL = "http://localhost:8081";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
```

### Common Mocks

#### Supabase Client
```typescript
const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    }),
  },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));
```

#### Next.js Router
```typescript
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

## Writing Good Tests

### Tier 1 (Pure Functions)

```typescript
// ✅ Good: Isolated, fast, clear assertions
describe("validateWorkspaceSlug", () => {
  it("should reject consecutive hyphens", () => {
    const result = validateWorkspaceSlug("my--team");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Cannot contain consecutive hyphens");
  });
});
```

### Tier 2 (Integration)

```typescript
// ✅ Good: User-centric, async, realistic
it("should auto-generate slug from workspace name", async () => {
  render(<CreateWorkspaceForm />);
  
  const nameInput = screen.getByLabelText(/workspace name/i);
  await user.type(nameInput, "My Awesome Team");
  
  const slugInput = screen.getByLabelText(/workspace url/i);
  expect(slugInput).toHaveValue("my-awesome-team");
});
```

### Accessibility Testing

All form components should verify:
- Proper labels with `getByLabelText()`
- Error announcements with `role="alert"`
- Keyboard navigation support

## CI/CD Integration

Tests are run on every PR with coverage gates:
- Minimum overall coverage: 80%
- New code must maintain Tier 1 = 100% for pure functions
- PR fails if coverage drops

## Future Improvements

1. [ ] Add Storybook `play` functions for visual regression
2. [ ] Implement Playwright E2E for critical auth flows
3. [ ] Add performance testing for form validation
4. [ ] Create shared test utilities package
