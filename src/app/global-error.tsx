"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * App Router root global-error boundary.
 *
 * Catches unhandled rendering errors that bubble past `error.tsx`
 * boundaries lower in the tree. This is the last line of defence
 * before Next.js falls back to its built-in 500 page.
 *
 * `global-error.tsx` is special:
 *  - it MUST own its own `<html>` and `<body>` because the root
 *    `app/layout.tsx` is replaced when this boundary catches,
 *  - it MUST be a client component (Next requirement),
 *  - it must NOT depend on any provider or SDK that requires a context
 *    higher in the tree (those contexts are gone by the time this
 *    renders).
 *
 * Kept deliberately minimal:
 *  - no provider / SDK / Lumia DS imports,
 *  - no dynamic data,
 *  - inline styles only (we cannot rely on Tailwind/global CSS having
 *    loaded if the failure happened during the bootstrap phase).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Best-effort console log; in production the digest is the only
    // useful identifier (the message is redacted by Next).
    console.error("[GlobalError]", error?.digest ?? error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1.5rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#0f172a",
          background: "#ffffff",
        }}
      >
        <main role="main">
          <p
            style={{
              fontSize: "0.875rem",
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#64748b",
              margin: 0,
            }}
          >
            500
          </p>
          <h1
            style={{
              marginTop: "0.5rem",
              fontSize: "1.875rem",
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              marginTop: "0.75rem",
              maxWidth: "28rem",
              fontSize: "0.875rem",
              color: "#475569",
            }}
          >
            An unexpected error occurred while rendering this page. You can try
            again, or return to a known-good route.
          </p>
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                appearance: "none",
                border: "none",
                cursor: "pointer",
                borderRadius: "0.375rem",
                background: "#0f172a",
                color: "#ffffff",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
              }}
            >
              Try again
            </button>
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.375rem",
                border: "1px solid #cbd5e1",
                background: "transparent",
                color: "#0f172a",
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Go to sign in
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
