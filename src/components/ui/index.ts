/**
 * Shared UI components for authentication forms.
 * These components are used across LoginForm and SignupForm to maintain
 * consistency and reduce code duplication.
 */

export {
  OAuthButtons,
  OAUTH_PROVIDERS,
  type OAuthProvider,
} from "./OAuthButtons";
export { AuthDivider } from "./AuthDivider";
export { AuthErrorAlert } from "./AuthErrorAlert";

// Loading state components (AUTH-FE-1.8)
export {
  AuthPageSkeleton,
  AuthLoadingOverlay,
  InlineLoadingIndicator,
  LoadingTransition,
  AuthCheckingState,
  type AuthPageSkeletonProps,
  type AuthLoadingOverlayProps,
  type InlineLoadingIndicatorProps,
  type LoadingTransitionProps,
  type AuthCheckingStateProps,
} from "./loading";
