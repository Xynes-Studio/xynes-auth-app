/**
 * Unit tests for Auth Loading State components (Tier 2 - integration tests)
 *
 * @see AUTH-FE-1.8 — Auth Loading States
 * @see ADR-001 - Testing Standards
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import {
  AuthPageSkeleton,
  AuthLoadingOverlay,
  InlineLoadingIndicator,
  LoadingTransition,
  AuthCheckingState,
} from "./AuthLoadingStates";

// Mock @lumia-ui/components
vi.mock("@lumia-ui/components", () => ({
  Skeleton: ({
    width,
    height,
    className,
    rounded,
  }: {
    width?: string | number;
    height?: number;
    className?: string;
    rounded?: string;
  }) => (
    <div
      data-testid="skeleton"
      data-width={width}
      data-height={height}
      data-rounded={rounded}
      className={className}
    />
  ),
  Spinner: ({
    size,
    "aria-label": ariaLabel,
    "aria-hidden": ariaHidden,
  }: {
    size?: number | string;
    "aria-label"?: string;
    "aria-hidden"?: boolean | "true" | "false";
  }) => (
    <div
      data-testid="spinner"
      data-size={size}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  ),
}));

describe("AuthPageSkeleton", () => {
  it("should render with default props", () => {
    render(<AuthPageSkeleton />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading");
  });

  it("should render with custom title", () => {
    render(<AuthPageSkeleton title="Checking authentication" />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Checking authentication"
    );
    expect(screen.getByText("Checking authentication")).toBeInTheDocument();
  });

  it("should render form skeleton by default", () => {
    render(<AuthPageSkeleton />);

    // Should have multiple skeletons for form fields
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(5);
  });

  it("should hide form skeleton when showForm is false", () => {
    const { rerender } = render(<AuthPageSkeleton showForm={true} />);
    const withFormCount = screen.getAllByTestId("skeleton").length;

    rerender(<AuthPageSkeleton showForm={false} />);
    const withoutFormCount = screen.getAllByTestId("skeleton").length;

    expect(withoutFormCount).toBeLessThan(withFormCount);
  });

  it("should hide OAuth skeleton when showOAuth is false", () => {
    const { rerender } = render(<AuthPageSkeleton showOAuth={true} />);
    const withOAuthCount = screen.getAllByTestId("skeleton").length;

    rerender(<AuthPageSkeleton showOAuth={false} />);
    const withoutOAuthCount = screen.getAllByTestId("skeleton").length;

    expect(withoutOAuthCount).toBeLessThan(withOAuthCount);
  });

  it("should have screen reader announcement", () => {
    render(<AuthPageSkeleton title="Loading page" />);

    const srOnly = screen.getByText("Loading page");
    expect(srOnly).toHaveClass("sr-only");
  });
});

describe("AuthLoadingOverlay", () => {
  it("should not render overlay when not visible", () => {
    render(
      <AuthLoadingOverlay isVisible={false} message="Test">
        <div data-testid="content">Content</div>
      </AuthLoadingOverlay>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should render overlay when visible", () => {
    render(
      <AuthLoadingOverlay isVisible={true} message="Signing out...">
        <div data-testid="content">Content</div>
      </AuthLoadingOverlay>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
    // Use getAllByText since text appears in both visible and sr-only elements
    expect(screen.getAllByText("Signing out...")).toHaveLength(2);
  });

  it("should render children behind overlay", () => {
    render(
      <AuthLoadingOverlay isVisible={true}>
        <div data-testid="content">Content</div>
      </AuthLoadingOverlay>
    );

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should use default message when not provided", () => {
    render(<AuthLoadingOverlay isVisible={true} />);

    // Use getAllByText since text appears in both visible and sr-only elements
    expect(screen.getAllByText("Loading...")).toHaveLength(2);
  });

  it("should have spinner", () => {
    render(<AuthLoadingOverlay isVisible={true} />);

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("should announce to screen readers when visibility changes", async () => {
    const { rerender } = render(<AuthLoadingOverlay isVisible={false} />);

    rerender(<AuthLoadingOverlay isVisible={true} message="Processing..." />);

    await waitFor(() => {
      const liveRegion = screen.getByRole("status", { hidden: true });
      expect(liveRegion).toHaveAttribute("aria-label", "Processing...");
    });
  });
});

describe("InlineLoadingIndicator", () => {
  it("should not render when not loading", () => {
    render(<InlineLoadingIndicator isLoading={false} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("should render when loading", () => {
    render(<InlineLoadingIndicator isLoading={true} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should have accessible label", () => {
    render(
      <InlineLoadingIndicator
        isLoading={true}
        message="Checking availability"
      />
    );

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Checking availability"
    );
  });

  it("should use default message", () => {
    render(<InlineLoadingIndicator isLoading={true} />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Loading");
  });

  it("should render spinner with correct size for sm", () => {
    render(<InlineLoadingIndicator isLoading={true} size="sm" />);

    expect(screen.getByTestId("spinner")).toHaveAttribute("data-size", "16");
  });

  it("should render spinner with correct size for md", () => {
    render(<InlineLoadingIndicator isLoading={true} size="md" />);

    expect(screen.getByTestId("spinner")).toHaveAttribute("data-size", "20");
  });

  it("should have screen reader text", () => {
    render(
      <InlineLoadingIndicator isLoading={true} message="Validating email" />
    );

    expect(screen.getByText("Validating email")).toHaveClass("sr-only");
  });
});

describe("LoadingTransition", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should show loading content when loading", () => {
    render(
      <LoadingTransition
        isLoading={true}
        loadingContent={<div data-testid="loading">Loading...</div>}
      >
        <div data-testid="content">Content</div>
      </LoadingTransition>
    );

    expect(screen.getByTestId("loading")).toBeInTheDocument();
    expect(screen.queryByTestId("content")).not.toBeInTheDocument();
  });

  it("should show children when not loading", () => {
    render(
      <LoadingTransition
        isLoading={false}
        loadingContent={<div data-testid="loading">Loading...</div>}
      >
        <div data-testid="content">Content</div>
      </LoadingTransition>
    );

    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should respect minLoadingTime before showing content", async () => {
    const { rerender } = render(
      <LoadingTransition
        isLoading={true}
        loadingContent={<div data-testid="loading">Loading...</div>}
        minLoadingTime={300}
      >
        <div data-testid="content">Content</div>
      </LoadingTransition>
    );

    // Loading starts
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    // Simulate loading finishes after 100ms
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    rerender(
      <LoadingTransition
        isLoading={false}
        loadingContent={<div data-testid="loading">Loading...</div>}
        minLoadingTime={300}
      >
        <div data-testid="content">Content</div>
      </LoadingTransition>
    );

    // Should still show loading (min time not reached)
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    // Advance to complete min time
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    // Now should show content
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should show content immediately if loading time exceeds minLoadingTime", async () => {
    const { rerender } = render(
      <LoadingTransition
        isLoading={true}
        loadingContent={<div data-testid="loading">Loading...</div>}
        minLoadingTime={200}
      >
        <div data-testid="content">Content</div>
      </LoadingTransition>
    );

    // Simulate loading takes 500ms (more than minLoadingTime)
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    rerender(
      <LoadingTransition
        isLoading={false}
        loadingContent={<div data-testid="loading">Loading...</div>}
        minLoadingTime={200}
      >
        <div data-testid="content">Content</div>
      </LoadingTransition>
    );

    // Should show content immediately (min time already passed)
    expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("content")).toBeInTheDocument();
  });

  it("should use default minLoadingTime of 200ms", async () => {
    const { rerender } = render(
      <LoadingTransition
        isLoading={true}
        loadingContent={<div data-testid="loading">Loading...</div>}
      >
        <div data-testid="content">Content</div>
      </LoadingTransition>
    );

    // Loading finishes immediately
    rerender(
      <LoadingTransition
        isLoading={false}
        loadingContent={<div data-testid="loading">Loading...</div>}
      >
        <div data-testid="content">Content</div>
      </LoadingTransition>
    );

    // Should still show loading due to default 200ms min time
    expect(screen.getByTestId("loading")).toBeInTheDocument();

    // Advance past default min time
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId("content")).toBeInTheDocument();
  });
});

describe("AuthCheckingState", () => {
  it("should render with default message", () => {
    render(<AuthCheckingState />);

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Checking authentication..."
    );
    // Use getAllByText since text appears in both visible and sr-only elements
    expect(screen.getAllByText("Checking authentication...")).toHaveLength(2);
  });

  it("should render with custom message", () => {
    render(<AuthCheckingState message="Verifying session..." />);

    expect(screen.getByRole("status")).toHaveAttribute(
      "aria-label",
      "Verifying session..."
    );
    // Use getAllByText since text appears in both visible and sr-only elements
    expect(screen.getAllByText("Verifying session...")).toHaveLength(2);
  });

  it("should have aria-busy attribute", () => {
    render(<AuthCheckingState />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("should render spinner", () => {
    render(<AuthCheckingState />);

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("should have screen reader announcement", () => {
    render(<AuthCheckingState message="Loading..." />);

    const srOnly = screen.getByText("Loading...", { selector: ".sr-only" });
    expect(srOnly).toHaveAttribute("aria-live", "polite");
  });
});
