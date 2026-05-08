import Link from "next/link";
import type { Metadata } from "next";

/**
 * App Router root not-found page.
 *
 * Renders for unknown routes and any explicit `notFound()` calls.
 * Kept deliberately minimal:
 *  - server component, no `"use client"` (so prerender can statically
 *    evaluate it),
 *  - no provider / SDK / Lumia DS imports (those are wired in
 *    `app/providers.tsx`, which only runs under the `AuthGuard` tree —
 *    not-found can be reached before providers mount),
 *  - no dynamic data (this page is statically generated).
 *
 * Styling uses Tailwind utilities only; matches the dark-on-light
 * background convention used by the auth split layout.
 */
export const metadata: Metadata = {
  title: "Page not found • Xynes Auth",
  description: "The page you were looking for could not be found.",
};

export default function NotFound() {
  return (
    <main
      role="main"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16 text-center"
    >
      <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
        404
      </p>
      <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        The page you were looking for doesn’t exist or has been moved.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Go to sign in
        </Link>
        <Link
          href="/workspaces"
          className="inline-flex items-center justify-center rounded-md border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Go to workspaces
        </Link>
      </div>
    </main>
  );
}
