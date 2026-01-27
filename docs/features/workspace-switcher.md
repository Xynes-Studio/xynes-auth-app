# Workspace Switcher Component

## Overview

The `WorkspaceSwitcher` component provides a dropdown interface for users to switch between their workspaces without navigating to a separate page. It displays the current workspace and allows users to select a different workspace or create a new one.

## Features

- **Current Workspace Display**: Shows the current workspace name with avatar/initials
- **Dropdown Menu**: Lists all available workspaces with visual distinction
- **Switch Functionality**: Click to switch and navigate to workspace dashboard
- **Create New Workspace**: Quick access to workspace creation flow
- **Size Variants**: Supports `sm` and `default` sizes
- **Accessibility**: Full keyboard navigation and screen reader support
- **Custom Trigger**: Allows custom trigger element for flexible integration

## Installation

The component uses the following dependencies:
- `@lumia-ui/components` - For Menu, Avatar, Button, and Spinner components
- `@xynes/auth-sdk` - For `useAuth` and `useWorkspace` hooks

## Usage

### Basic Usage

```tsx
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";

function Header() {
  return (
    <header>
      <WorkspaceSwitcher />
    </header>
  );
}
```

### With Custom Callbacks

```tsx
<WorkspaceSwitcher
  onWorkspaceSelect={(workspace) => {
    console.log("Selected:", workspace.name);
    // Custom navigation logic
  }}
  onCreateNew={() => {
    router.push("/custom-onboarding");
  }}
/>
```

### With Role Badge

```tsx
<WorkspaceSwitcher showRole />
```

### Small Size Variant

```tsx
<WorkspaceSwitcher size="sm" />
```

### Custom Trigger

```tsx
<WorkspaceSwitcher
  customTrigger={
    <button className="custom-button">
      Switch Workspace
    </button>
  }
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onWorkspaceSelect` | `(workspace: Workspace) => void` | - | Custom callback when workspace is selected |
| `onCreateNew` | `() => void` | - | Custom callback for creating new workspace |
| `customTrigger` | `React.ReactElement` | - | Custom trigger element |
| `size` | `"sm" \| "default"` | `"default"` | Size variant |
| `showRole` | `boolean` | `false` | Show role badge in trigger |
| `consoleUrl` | `string` | - | Custom console URL for navigation |
| `className` | `string` | - | CSS class for trigger button |

## Accessibility

The component implements the following accessibility features:

- **ARIA Labels**: Dynamic labels describing current workspace and available options
- **Keyboard Navigation**: Full keyboard support via Menu component
- **Screen Reader**: Announces workspace changes and available options
- **Focus Management**: Proper focus handling for trigger and menu items

## SDK Utilities

The SDK exports utility functions for building custom workspace switchers:

```tsx
import {
  getWorkspaceInitials,
  formatWorkspaceRole,
  sortWorkspacesForSwitcher,
  getOtherWorkspaces,
  sanitizeWorkspaceSlug,
  buildWorkspaceDashboardUrl,
  getWorkspaceSwitcherAriaLabel,
} from "@xynes/auth-sdk";
```

### Utility Functions

| Function | Description |
|----------|-------------|
| `getWorkspaceInitials(name)` | Get display initials from workspace name |
| `formatWorkspaceRole(role)` | Convert role to human-readable label |
| `sortWorkspacesForSwitcher(workspaces, currentId)` | Sort with current first |
| `getOtherWorkspaces(workspaces, currentId)` | Filter excluding current |
| `sanitizeWorkspaceSlug(slug)` | Sanitize slug for URL safety |
| `buildWorkspaceDashboardUrl(slug, consoleUrl)` | Build navigation URL |
| `getWorkspaceSwitcherAriaLabel(name, count)` | Generate accessible label |

## Testing

The component includes comprehensive tests following ADR-001 testing standards:

- **Unit Tests**: Pure utility functions (100% coverage)
- **Integration Tests**: Component behavior (70%+ coverage)

Run tests:

```bash
# Run workspace component tests
npm test src/components/workspace/

# Run with coverage
npm run test:coverage src/components/workspace/
```

## Implementation Details

### File Structure

```
xynes-auth-sdk/
├── src/modules/workspace/
│   ├── utils/
│   │   ├── workspace-switcher-utils.ts     # Pure functions
│   │   ├── workspace-switcher-utils.test.ts # Unit tests
│   │   └── index.ts                         # Exports
│   └── index.ts                             # Module exports

xynes-auth-app/
├── src/components/workspace/
│   ├── WorkspaceSwitcher.tsx                # Component
│   ├── WorkspaceSwitcher.integration.test.tsx # Integration tests
│   ├── WorkspaceSelector.tsx                # Full page selector
│   └── WorkspaceSelector.test.tsx           # Selector tests
```

### Security Considerations

- **Slug Sanitization**: All workspace slugs are sanitized before URL construction
- **URL Validation**: Console URLs are validated to prevent open redirects
- **Defense in Depth**: Multiple validation layers ensure safe navigation

## Related Stories

- AUTH-FE-2.1: Workspace Provider
- AUTH-FE-2.3: Workspace Selector Page
- AUTH-FE-2.2: Onboarding Page (Create Workspace)
