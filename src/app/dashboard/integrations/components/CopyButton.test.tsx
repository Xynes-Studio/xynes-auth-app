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
});
