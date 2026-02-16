# Workspace Selector Page

**Feature ID:** AUTH-FE-2.3
**Status:** `DONE`
**Last Updated:** 2026-02-03

## Overview

The Workspace Selector Page allows users with multiple workspaces to choose which workspace they want to access. It provides a visual list of available workspaces and an option to create a new one.

Post-login note: users with existing workspaces are routed directly to `/dashboard/users`; `/workspaces` is primarily used for explicit workspace selection flows.

## User Story

**As a** user with multiple workspaces
**I want to** select which workspace to use
**So that** I can switch between projects

## Implementation Details

### Components

#### `WorkspaceSelector` (`src/components/workspace/WorkspaceSelector.tsx`)

A presentation component that renders a grid of workspace cards.

- **Props:**
  - `workspaces`: Array of `Workspace` objects.
  - `onSelect`: Callback function when a workspace is selected.
  - `onCreateNew`: Callback function for the "Create New" action.
  - `isLoading`: Boolean to show loading state.
  - `loadingText`: Optional label shown during loading (used to avoid "rage-clicking" confusion during selection).

- **Features:**
  - Responsive grid layout.
  - Hover effects for better UX.
  - Keyboard navigation support (`Tab`, `Enter`, `Space`).
  - Empty state handling.
  - Loading state handling.

### Page

#### `WorkspacesPage` (`src/app/workspaces/page.tsx`)

The main page component handling data fetching and navigation.

- **Route:** `/workspaces`
- **Protection:** Wrapped in `AuthGuard` to ensure only authenticated users access it.
- **Logic:**
  - Fetches workspaces using `useAuth`.
  - Handles selection logic using `useWorkspace`.
  - Only performs an external redirect (e.g., CMS portal) when an explicit safe `redirect` query param is provided; otherwise it stays in the auth app and routes to `/dashboard/users` after selection.
  - Prevents repeated rapid clicks by immediately switching to a "selecting" loading state and ignoring subsequent selections.

#### Placeholder Confirmation (`src/app/workspaces/selected/page.tsx`)

- **Route:** `/workspaces/selected`
- **Purpose:** Legacy in-app confirmation route retained for compatibility.
- **Behavior:** Current default selection flow routes to `/dashboard/users` when no external redirect destination is provided.

## Design Decisions

1.  **Component Segregation:** The selector UI is separated into a dumb component (`WorkspaceSelector`) for reusability and testing, while the page handles the logic.
2.  **Lumia UI Integration:** Utilizes `@lumia-ui/components` (Card, Button, Spinner) to maintain design consistency.
3.  **Accessibility:** Explicitly handled keyboard interactions for cards since they function as buttons.
4.  **Navigation:** Redirection logic is centralized in the page component and only redirects externally when an explicit, validated `redirect` query param is present.
5.  **Rage-click Prevention:** Selection immediately transitions into a loading state and ignores subsequent clicks to prevent multi-select race conditions.

## Testing Strategy

- **Unit Tests:** `WorkspaceSelector.test.tsx` covers:
  - Rendering of workspace list.
  - Click interactions (Selection, Creation).
  - Empty and Loading states.
  - Keyboard events.
- **Coverage Goal:** > 80%
  - Includes regression for repeated rapid clicks (selection is invoked once).

## Usage

```tsx
import { WorkspaceSelector } from "@/components/workspace/WorkspaceSelector";

// ... inside a component
<WorkspaceSelector
  workspaces={myWorkspaces}
  onSelect={(id) => handleSelect(id)}
  onCreateNew={() => router.push('/new')}
/>
```
