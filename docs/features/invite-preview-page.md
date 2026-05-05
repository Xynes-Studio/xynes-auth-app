# Invite Preview Page

## Overview
The Invite Preview Page allows users to view details about a workspace invitation before accepting it. This page handles both authenticated and unauthenticated user flows, displaying appropriate UI based on the user's authentication status.

## Location
- **Route**: `/invite/[token]`
- **File**: `src/app/invite/[token]/page.tsx`
- **Component**: `src/components/invite/InvitePreview.tsx`

## Functionality

### States Handled
1. **Loading State**: Shows skeleton UI while fetching invite details
2. **Valid Invite**: Displays invite details (workspace name, inviter, role, expiration)
3. **Expired Invite**: Shows specific error card when invite has expired
4. **Cancelled Invite**: Shows specific error card when invite has been cancelled
5. **Invalid/Not Found Invite**: Shows specific error card when invite is invalid or not found (404)
6. **Already A Member**: Shows tailored success/info card when user is already a member
7. **Error State**: Displays generic API errors for other issues

### User Flows
1. **Authenticated User**:
   - Sees invite details
   - Can directly accept the invite with a "Join Workspace" button
   - After acceptance, redirects to workspace dashboard

2. **Unauthenticated User**:
   - Sees invite details
   - Prompted to sign in to accept the invitation
   - "Sign In to Continue" button redirects to login with return URL
   - Option to sign up if no account exists

## Components Used
- `@lumia-ui/components` (Button, Card, Skeleton, Alert, Badge)

## Hooks Used
- `useAuth` from `@xynes/auth-sdk` - Manages authentication state (provides `getAccessToken` for secure calls)
- `useInvite` from `@xynes/auth-sdk` - Resolves and accepts invites (uses authenticated API calls)

## Accessibility Features
- Proper ARIA attributes (roles, labels, descriptions)
- Semantic HTML structure
- Focus management and keyboard navigation
- Screen reader-friendly elements
- Proper heading hierarchy

## Error Handling
- Network error detection
- Invalid/expired invite handling
- Clear error messaging
- Graceful fallback states

## Security Considerations
- Uses secure invite token resolution
- Validates invite status before allowing acceptance
- Prevents unauthorized access to workspaces
- Requires a valid authentication token for accepting invites

## Testing
- Comprehensive test suite with 9 test cases
- Covers all major user flows and edge cases
- Mocks external dependencies appropriately
- Verifies accessibility attributes