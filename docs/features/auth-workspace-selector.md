# Workspace Selector Page

**Feature ID:** AUTH-FE-2.3
**Status:** `DONE`
**Last Updated:** 2026-01-27

## Overview

The Workspace Selector Page allows users with multiple workspaces to choose which workspace they want to access. It provides a visual list of available workspaces and an option to create a new one.

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
  - Redirects to the console/dashboard upon selection.

## Design Decisions

1.  **Component Segregation:** The selector UI is separated into a dumb component (`WorkspaceSelector`) for reusability and testing, while the page handles the logic.
2.  **Lumia UI Integration:** Utilizes `@lumia-ui/components` (Card, Button, Spinner) to maintain design consistency.
3.  **Accessibility:** Explicitly handled keyboard interactions for cards since they function as buttons.
4.  **Navigation:** Redirection logic is centralized in the page component, currently pointing to a configured console URL or a fallback local path.

## Testing Strategy

- **Unit Tests:** `WorkspaceSelector.test.tsx` covers:
  - Rendering of workspace list.
  - Click interactions (Selection, Creation).
  - Empty and Loading states.
  - Keyboard events.
- **Coverage Goal:** > 80%

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
