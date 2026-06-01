"use client";

/**
 * CopyButton
 *
 * Small copy-to-clipboard affordance used by the integrations surface (DNS
 * verification record cells, one-time secret reveals). Lumia DS has no
 * dedicated copy primitive, so this wraps the Lumia `Button` with an icon and
 * a transient "Copied" confirmation.
 *
 * - The clipboard write is best-effort: when the browser refuses (no user
 *   gesture, missing permission, insecure context) the visible value stays
 *   on screen for manual copy and no error is surfaced.
 * - Visible labels are passed in (i18n-ready) so this component carries no
 *   hard-coded copy.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@lumia-ui/components";
import { Icon } from "@lumia-ui/icons";

export interface CopyButtonProps {
  /** The exact string written to the clipboard. */
  value: string;
  /** Visible label in the idle state (e.g. translated "Copy"). */
  label: string;
  /** Visible label shown briefly after a successful copy (e.g. "Copied"). */
  copiedLabel: string;
  /** Accessible name describing what is being copied. */
  ariaLabel: string;
  /**
   * Optional value that, when it changes, clears the transient "Copied"
   * state. Use it to reset the button when the surrounding context shows a
   * brand-new secret (e.g. a regenerated DNS verification value) so a stale
   * "Copied" pill never implies the new value was already copied — even for
   * sibling cells whose own `value` did not change.
   */
  resetKey?: unknown;
  className?: string;
}

export function CopyButton({
  value,
  label,
  copiedLabel,
  ariaLabel,
  resetKey,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState<boolean>(false);

  // Clear the "Copied" affordance when the reveal context changes so a
  // freshly-shown value never inherits a previous "Copied" state.
  useEffect(() => {
    setCopied(false);
  }, [resetKey]);

  const handleCopy = useCallback(async () => {
    // Only flip to the "Copied" state on a CONFIRMED successful clipboard
    // write. If `navigator.clipboard` is unavailable (insecure context, no
    // user gesture, missing permission, or the browser doesn't expose the
    // API) OR if `writeText` rejects, we MUST NOT claim the value was
    // copied — the user relies on this signal to dismiss one-time secrets
    // (API keys, DNS verification values) and a false-positive "Copied"
    // can cause irrecoverable data loss for the API-key reveal flow.
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      // No clipboard API at all. The visible value stays on-screen so the
      // user can copy it manually; the button keeps its idle label.
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard rejected the write (insecure context, denied permission,
      // user gesture lost). Silently leave the button in the idle state —
      // the visible value remains for manual copy.
      return;
    }
    setCopied(true);
    if (typeof window !== "undefined") {
      window.setTimeout(() => setCopied(false), 1500);
    }
  }, [value]);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      aria-label={ariaLabel}
      className={className}
    >
      <Icon
        name={copied ? "check" : "copy"}
        size={14}
        color="currentColor"
        aria-hidden
      />
      {copied ? copiedLabel : label}
    </Button>
  );
}
