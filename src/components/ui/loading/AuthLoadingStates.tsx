/**
 * Auth Loading Components
 *
 * Provides accessible loading states for authentication operations.
 * Includes full-page skeletons, inline spinners, and button loading states.
 *
 * @module components/ui/loading
 * @see AUTH-FE-1.8 — Auth Loading States
 */

"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Skeleton, Spinner } from "@lumia-ui/components";

/**
 * Props for AuthPageSkeleton component
 */
export interface AuthPageSkeletonProps {
  /** Optional title for screen readers */
  title?: string;
  /** Whether to show form skeleton */
  showForm?: boolean;
  /** Whether to show OAuth buttons skeleton */
  showOAuth?: boolean;
}

/**
 * Full-page skeleton for auth pages during initial load.
 * Used when checking authentication state.
 *
 * @example
 * ```tsx
 * if (isLoading) {
 *   return <AuthPageSkeleton title="Checking authentication" />;
 * }
 * ```
 */
export function AuthPageSkeleton({
  title = "Loading",
  showForm = true,
  showOAuth = true,
}: AuthPageSkeletonProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gray-50 p-4"
      role="status"
      aria-label={title}
      aria-busy="true"
    >
      <div className="w-full max-w-md space-y-6">
        {/* Header skeleton */}
        <div className="space-y-2 text-center">
          <Skeleton width="60%" height={32} className="mx-auto" />
          <Skeleton width="80%" height={16} className="mx-auto" />
        </div>

        {showForm && (
          <div className="space-y-4">
            {/* Email field skeleton */}
            <div className="space-y-2">
              <Skeleton width="20%" height={14} />
              <Skeleton height={40} rounded="md" />
            </div>

            {/* Password field skeleton */}
            <div className="space-y-2">
              <Skeleton width="25%" height={14} />
              <Skeleton height={40} rounded="md" />
            </div>

            {/* Button skeleton */}
            <Skeleton height={44} rounded="md" />
          </div>
        )}

        {showOAuth && (
          <>
            {/* Divider skeleton */}
            <div className="flex items-center gap-4">
              <Skeleton height={1} className="flex-1" />
              <Skeleton width={24} height={14} />
              <Skeleton height={1} className="flex-1" />
            </div>

            {/* OAuth buttons skeleton */}
            <div className="space-y-3">
              <Skeleton height={44} rounded="md" />
              <Skeleton height={44} rounded="md" />
            </div>
          </>
        )}

        {/* Footer link skeleton */}
        <div className="text-center">
          <Skeleton width="60%" height={14} className="mx-auto" />
        </div>
      </div>

      {/* Screen reader announcement */}
      <span className="sr-only" aria-live="polite">
        {title}
      </span>
    </div>
  );
}

/**
 * Props for AuthLoadingOverlay component
 */
export interface AuthLoadingOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;
  /** Loading message to display */
  message?: string;
  /** Optional children to render behind overlay */
  children?: ReactNode;
}

/**
 * Full-page loading overlay with spinner.
 * Used for operations like sign-out or redirect.
 *
 * @example
 * ```tsx
 * <AuthLoadingOverlay isVisible={isSigningOut} message="Signing out...">
 *   <PageContent />
 * </AuthLoadingOverlay>
 * ```
 */
export function AuthLoadingOverlay({
  isVisible,
  message = "Loading...",
  children,
}: AuthLoadingOverlayProps) {
  // Announce to screen readers when loading starts
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    if (isVisible) {
      setAnnouncement(message);
    } else {
      setAnnouncement(null);
    }
  }, [isVisible, message]);

  return (
    <div className="relative">
      {children}

      {isVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm"
          role="status"
          aria-label={message}
          aria-busy="true"
        >
          <div className="flex flex-col items-center space-y-4">
            <Spinner size="lg" aria-hidden="true" />
            <p className="text-sm font-medium text-gray-600">{message}</p>
          </div>
        </div>
      )}

      {/* Accessible announcement region */}
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </div>
  );
}

/**
 * Props for InlineLoadingIndicator component
 */
export interface InlineLoadingIndicatorProps {
  /** Whether loading is active */
  isLoading: boolean;
  /** Loading message for screen readers */
  message?: string;
  /** Size of the spinner */
  size?: "sm" | "md";
}

/**
 * Inline loading indicator for async validation or field-level loading.
 *
 * @example
 * ```tsx
 * <div className="flex items-center gap-2">
 *   <input {...props} />
 *   <InlineLoadingIndicator isLoading={isValidating} message="Checking availability" />
 * </div>
 * ```
 */
export function InlineLoadingIndicator({
  isLoading,
  message = "Loading",
  size = "sm",
}: InlineLoadingIndicatorProps) {
  if (!isLoading) {
    return null;
  }

  const spinnerSize = size === "sm" ? 16 : 20;

  return (
    <span
      className="inline-flex items-center"
      role="status"
      aria-label={message}
    >
      <Spinner size={spinnerSize} aria-hidden="true" />
      <span className="sr-only">{message}</span>
    </span>
  );
}

/**
 * Props for LoadingTransition component
 */
export interface LoadingTransitionProps {
  /** Whether content is loading */
  isLoading: boolean;
  /** Content to show while loading */
  loadingContent: ReactNode;
  /** Content to show when loaded */
  children: ReactNode;
  /** Minimum display time for loading state (ms) to prevent flash */
  minLoadingTime?: number;
}

/**
 * Smooth transition wrapper that prevents flash of wrong content.
 * Ensures loading state is shown for at least minLoadingTime ms.
 *
 * @example
 * ```tsx
 * <LoadingTransition
 *   isLoading={isAuthenticating}
 *   loadingContent={<AuthPageSkeleton />}
 *   minLoadingTime={300}
 * >
 *   <AuthenticatedContent />
 * </LoadingTransition>
 * ```
 */
export function LoadingTransition({
  isLoading,
  loadingContent,
  children,
  minLoadingTime = 200,
}: LoadingTransitionProps) {
  const [showLoading, setShowLoading] = useState(isLoading);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading && !loadingStartTime) {
      // Loading started
      setLoadingStartTime(Date.now());
      setShowLoading(true);
    } else if (!isLoading && loadingStartTime) {
      // Loading finished - check if min time has passed
      const elapsed = Date.now() - loadingStartTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);

      if (remaining > 0) {
        const timer = setTimeout(() => {
          setShowLoading(false);
          setLoadingStartTime(null);
        }, remaining);
        return () => clearTimeout(timer);
      } else {
        setShowLoading(false);
        setLoadingStartTime(null);
      }
    }
  }, [isLoading, loadingStartTime, minLoadingTime]);

  return <>{showLoading ? loadingContent : children}</>;
}

/**
 * Props for AuthCheckingState component
 */
export interface AuthCheckingStateProps {
  /** Custom message to display */
  message?: string;
}

/**
 * Minimal centered spinner for auth checking state.
 * Useful for places that need a simple full-page auth-check loader.
 */
export function AuthCheckingState({
  message = "Checking authentication...",
}: AuthCheckingStateProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      role="status"
      aria-label={message}
      aria-busy="true"
    >
      <div className="flex flex-col items-center space-y-3">
        <Spinner size="lg" aria-hidden="true" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
      <span className="sr-only" aria-live="polite">
        {message}
      </span>
    </div>
  );
}
