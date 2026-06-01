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

import { useCallback, useState } from "react";
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
  className?: string;
}

export function CopyButton({
  value,
  label,
  copiedLabel,
  ariaLabel,
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        // Silently fall through — the visible value remains for manual copy.
      }
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
      <Icon name={copied ? "check" : "copy"} size={14} color="currentColor" aria-hidden />
      {copied ? copiedLabel : label}
    </Button>
  );
}
