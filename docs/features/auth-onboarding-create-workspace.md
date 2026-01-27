# AUTH-FE-2.2 — Onboarding Page (Create Workspace)

## Overview

This feature provides a user-friendly onboarding experience for new users to create their first workspace. It includes comprehensive validation, real-time slug availability checking, and seamless integration with the workspace dashboard.

## Status

- **Story ID**: AUTH-FE-2.2
- **Status**: DONE
- **Priority**: P0 — Sprint 1
- **Points**: 3
- **Dependencies**: AUTH-FE-2.1 (Workspace Provider)

## Features Implemented

### ✅ Acceptance Criteria

- [x] **Friendly onboarding UI with clear instructions** — Card-based layout with welcome message and step-by-step guidance
- [x] **Workspace name input field** — Full validation with min/max length checks
- [x] **Workspace slug input with auto-generation** — Automatically generates slug from workspace name
- [x] **Live slug validation (format, availability)** — Real-time validation with debounced API calls
- [x] **Slug format rules displayed** — Clear instructions shown below the slug input
- [x] **Error handling for duplicate slugs (409)** — Graceful error display when slug is taken
- [x] **Success redirects to workspace dashboard** — Automatic redirect after creation
- [x] **Alternative: "Have an invite?" link** — Link to join existing workspaces

## Architecture

### File Structure

```
src/
├── app/
│   └── onboarding/
│       └── page.tsx                              # Onboarding page with metadata
├── components/
│   └── onboarding/
│       ├── CreateWorkspaceForm.tsx               # Main form component
│       ├── CreateWorkspaceForm.integration.test.tsx # Integration tests (ADR naming)
│       └── index.ts                              # Component exports
└── lib/
    └── workspace/
        ├── validation.ts                         # Pure validation functions (Tier 1)
        ├── validation.test.ts                    # Unit tests (100% coverage)
        ├── schemas.ts                            # Zod schemas for form validation
        └── index.ts                              # Module exports
```

### Component Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      OnboardingPage                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  CreateWorkspaceForm                    │ │
│  │                                                         │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │ Workspace Name Input                              │ │ │
│  │  │ - Validates min/max length                        │ │ │
│  │  │ - Triggers auto-slug generation                   │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │                          ↓                              │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │ Workspace Slug Input (with prefix)                │ │ │
│  │  │ - Auto-generated from name                        │ │ │
│  │  │ - Manual editing supported                        │ │ │
│  │  │ - Live format validation                          │ │ │
│  │  │ - Debounced availability check (500ms)            │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │                          ↓                              │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │ Submit Button                                     │ │ │
│  │  │ - Disabled when invalid/checking/unavailable      │ │ │
│  │  │ - Loading state during submission                 │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  │                          ↓                              │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │ "Have an invite?" Link                            │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## API Integration

### Endpoints Used

1. **Check Slug Availability**
   ```
   GET /workspaces/check-slug/{slug}
   Response: { available: boolean }
   ```

2. **Create Workspace**
   ```
   POST /workspaces
   Headers: Authorization: Bearer {token}
   Body: { name: string, slug: string }
   Response: { id: string, name: string, slug: string }
   ```

### Error Handling

| Status Code | Error Type | User Message |
|-------------|------------|--------------|
| 409 | Duplicate slug | "A workspace with this URL already exists" |
| 4xx | Client error | Error message from API |
| 5xx | Server error | "An unexpected error occurred" |

## Validation Rules

### Workspace Name
- **Min length**: 2 characters
- **Max length**: 100 characters
- **Trimmed**: Leading/trailing whitespace removed

### Workspace Slug
- **Min length**: 3 characters
- **Max length**: 50 characters
- **Format**: Lowercase letters, numbers, and hyphens only
- **Must start with**: A letter
- **Must not contain**: Consecutive hyphens
- **Must not end with**: A hyphen

### Auto-Generation Rules
When generating a slug from a workspace name:
1. Convert to lowercase
2. Replace spaces and underscores with hyphens
3. Remove special characters
4. Collapse consecutive hyphens
5. Remove leading/trailing hyphens
6. Prepend `w-` if starts with a number
7. Truncate to max length

## Test Coverage

| Module | Coverage | Tests |
|--------|----------|-------|
| `validation.ts` | 100% | 60 tests |
| `CreateWorkspaceForm.tsx` | 96.23% | 21 tests |
| **Total** | ~97% | 81 tests |

## Usage

### Basic Usage

```tsx
import { CreateWorkspaceForm } from '@/components/onboarding';

export default function OnboardingPage() {
  return (
    <main>
      <CreateWorkspaceForm />
    </main>
  );
}
```

### With Custom Callback

```tsx
<CreateWorkspaceForm
  apiBaseUrl="https://api.xynes.com"
  onSuccess={(workspace) => {
    console.log('Workspace created:', workspace);
    // Custom logic here
  }}
  redirectUrl="/custom-redirect"
/>
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `apiBaseUrl` | `string` | `process.env.NEXT_PUBLIC_API_URL` | Base URL for API calls |
| `onSuccess` | `(workspace) => void` | - | Callback after successful creation |
| `redirectUrl` | `string` | Console URL + slug | Custom redirect URL |

## Accessibility

- **Labels**: All form fields have proper labels
- **ARIA attributes**: Invalid states and descriptions linked
- **Keyboard navigation**: Full tab support
- **Screen reader**: Error announcements via `role="alert"`
- **Status announcements**: Slug availability via `role="status"`

## Security Considerations

1. **Authentication**: Uses Supabase session token for API calls
2. **Input validation**: Both client-side (Zod) and server-side validation
3. **XSS prevention**: React's built-in escaping
4. **No sensitive data exposure**: Tokens not logged or exposed

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Base URL for accounts API |
| `NEXT_PUBLIC_CONSOLE_URL` | No | URL for workspace console redirect |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |

## Design Tokens

Uses Lumia-DS components and theme tokens:
- `@lumia-ui/components`: Button, Alert, Card, CardContent, Spinner
- Tailwind CSS utilities for custom styling
- Theme-aware colors: `primary`, `muted-foreground`, `border`

## Future Enhancements

1. **Workspace templates**: Pre-configured workspace setups
2. **Bulk invite**: Invite team members during creation
3. **Logo upload**: Add workspace branding
4. **Plan selection**: Choose workspace tier (free/pro)
