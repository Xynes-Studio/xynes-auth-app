import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CopyButton } from "./CopyButton";

// Minimal Lumia Button mock so the test does not depend on the built design
// system bundle. `@lumia-ui/icons` is mocked globally in `src/test/setup.ts`.
vi.mock("@lumia-ui/components", () => ({
  Button: ({
    children,
    onClick,
    "aria-label": ariaLabel,
    type,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => (
    <button type={type ?? "button"} onClick={onClick} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

describe("CopyButton", () => {
  it("exposes the provided accessible name and idle label", () => {
    render(
      <CopyButton
        value="secret-value"
        label="Copy"
        copiedLabel="Copied"
        ariaLabel="Copy verification value"
      />,
    );

    const button = screen.getByRole("button", {
      name: /copy verification value/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Copy");
  });

  it("writes the value to the clipboard and shows the copied label on click", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <CopyButton
        value="xynes-verify=abc123"
        label="Copy"
        copiedLabel="Copied"
        ariaLabel="Copy DNS record value"
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /copy dns record value/i }),
    );

    expect(writeText).toHaveBeenCalledWith("xynes-verify=abc123");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /copy dns record value/i }),
      ).toHaveTextContent("Copied");
    });
  });

  // ── Regression: only flip to "Copied" on a CONFIRMED successful
  // clipboard write. Codex P2 review on PR #71 flagged that a false-
  // positive "Copied" on the one-time API-key reveal can cause a user
  // to dismiss the only copy of an irrecoverable secret.
  it("keeps the idle label when navigator.clipboard.writeText rejects", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("clipboard denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    render(
      <CopyButton
        value="xynes_live_secret"
        label="Copy"
        copiedLabel="Copied"
        ariaLabel="Copy API key"
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /copy api key/i }),
    );

    // The promise has settled by now; assert no "Copied" flash and the
    // idle label stays put.
    expect(writeText).toHaveBeenCalledWith("xynes_live_secret");
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /copy api key/i }),
      ).toHaveTextContent("Copy");
    });
    // A short grace window confirms no delayed flip either.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(
      screen.getByRole("button", { name: /copy api key/i }),
    ).toHaveTextContent("Copy");
  });

  it("keeps the idle label when navigator.clipboard is unavailable", async () => {
    // Simulate a browser that does not expose the Clipboard API (insecure
    // context, missing user gesture grant, etc.). `value: undefined`
    // matches what the runtime check `!navigator.clipboard?.writeText`
    // sees in that environment.
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
    });

    render(
      <CopyButton
        value="xynes_live_secret"
        label="Copy"
        copiedLabel="Copied"
        ariaLabel="Copy API key"
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: /copy api key/i }),
    );

    // No clipboard write occurred; the user-visible value remains on
    // screen for manual copy and the button MUST NOT claim it was copied.
    expect(
      screen.getByRole("button", { name: /copy api key/i }),
    ).toHaveTextContent("Copy");
  });
});
