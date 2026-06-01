/**
 * DNS instructions helpers (WSA-FIX-3)
 *
 * DNS provider UIs ask for two fields when adding a TXT record:
 *
 *   - **Name** (sometimes called "Host" or "Hostname")
 *   - **Value** (sometimes called "TXT data" or "Content")
 *
 * Many providers accept the **subdomain part only** for "Name" (e.g.
 * `_xynes` when adding a record under `example.com`), while others
 * require the **full FQDN** (e.g. `_xynes.example.com`). The verify
 * handler always stores the full FQDN in `verificationName`, so we
 * derive the subdomain-only label from the FQDN minus the apex
 * hostname.
 *
 * Pure helper: no DNS resolver, no external library, no network calls.
 *
 * Security notes:
 * - Both inputs are server-shaped strings; the row's `hostname` was
 *   validated through the create handler's normaliser and the
 *   `workspace_domains_hostname_shape` CHECK constraint, and
 *   `verificationName` is always `_xynes.${hostname}`. We still guard
 *   defensively against unexpected shapes (no shared suffix, empty
 *   strings, identical inputs) so a malformed row cannot crash the
 *   panel.
 * - The helper does not interpolate any field that ends in `Hash` or
 *   could carry secrets; both inputs are public DNS data.
 */

/**
 * Derive the "Name (subdomain only)" label that most DNS provider UIs
 * accept for a TXT record. The full FQDN form is preserved unchanged
 * on the row.
 *
 * Examples (with `_xynes` prefix produced by the verify handler):
 *
 *   verificationName: "_xynes.example.com"
 *   hostname:         "example.com"
 *   → "_xynes"
 *
 *   verificationName: "_xynes.sub.example.com"
 *   hostname:         "sub.example.com"
 *   → "_xynes.sub"
 *
 *   verificationName: "_xynes.deep.sub.example.com"
 *   hostname:         "deep.sub.example.com"
 *   → "_xynes.deep.sub"
 *
 * Falls back to the full FQDN when the inputs don't share the
 * expected `<subdomain>.<hostname>` shape — better to render the
 * canonical full name than to render an empty or misleading string.
 */
export function deriveSubdomainOnlyName(
  verificationName: string,
  hostname: string,
): string {
  // Guard against missing / blank inputs.
  if (!verificationName || !hostname) {
    return verificationName ?? "";
  }
  // If the two are identical we have no subdomain to peel off.
  if (verificationName === hostname) {
    return verificationName;
  }
  // Expect the FQDN to end in `.${hostname}` — strip exactly that.
  const suffix = `.${hostname}`;
  if (verificationName.endsWith(suffix)) {
    const subdomain = verificationName.slice(
      0,
      verificationName.length - suffix.length,
    );
    // Defensive: never return an empty subdomain. If the math produced
    // one (shouldn't happen given the equality guard above), fall back
    // to the full FQDN.
    return subdomain.length > 0 ? subdomain : verificationName;
  }
  // Unexpected shape: row's `verificationName` does not end in the
  // hostname. Render the full FQDN so the user can still copy
  // something useful.
  return verificationName;
}

/**
 * Static DNS instruction copy used by the panel's reveal block. Kept
 * here so the strings are exercised by both the helper unit tests and
 * the panel integration tests without duplicating literals.
 */
export const DNS_INSTRUCTION_COPY = {
  type: "TXT",
  ttl: "300 (or Auto)",
  helperHeading:
    "Most DNS providers ask for two fields when you add a TXT record. Use the values below — the exact label your provider uses (\u201CName\u201D, \u201CHost\u201D, \u201CHostname\u201D) varies.",
  // BUG-AUTH-7: render a clear 3-step intro instead of a dense
  // paragraph. Each step is one sentence so users can scan-and-do.
  // The actual sentences are deliberately short and i18n-ready
  // (they will move into the auth.integrations catalog when this
  // panel migrates to next-intl).
  steps: [
    "Log in to your DNS provider.",
    "Add this TXT record on your domain.",
    "Come back here and click \u201CVerify domain\u201D.",
  ] as const,
  // BUG-AUTH-7: copy for the warning callout that replaces the
  // dense "We only show this value once" body line. Rendered as
  // a Lumia DS `Alert variant="warning"` (not a paragraph) so the
  // AT semantics + colour token match the seriousness of "we
  // can't show this again".
  oneTimeWarning: {
    title: "We only show this value once",
    description:
      "Copy the value below now. If you lose it, you can request a new one from the \u201CGet new value\u201D action.",
  },
  // BUG-AUTH-7: failure copy for the inline destructive Alert.
  // Surfaced when the auto-recheck completes without flipping the
  // row to `verified`. Keeps the reveal open so users can re-copy
  // the value and retry, but adds the propagation-window hint.
  failureAlert: {
    title: "We couldn\u2019t find the TXT record",
    description:
      "DNS changes can take up to 48 hours to propagate. Double-check the record and try again later.",
  },
  disclosureLabel: "Where do I add this?",
  // Plain-text provider notes shown inside the disclosure. Kept short
  // and copy-stable so future translators can pick them up cleanly.
  providerNotes: [
    "Cloudflare \u2014 use the subdomain-only \u201CName\u201D (e.g. _xynes).",
    "AWS Route 53 \u2014 paste the full FQDN into \u201CRecord name\u201D and wrap the value in quotes.",
    "Namecheap \u2014 \u201CHost\u201D accepts the subdomain-only form.",
    "GoDaddy \u2014 \u201CHost\u201D accepts the subdomain-only form (use @ for the apex if asked).",
  ] as const,
  docsHref: "https://docs.xynes.com/guides/verify-domain",
  // Live-region announcements for the auto-recheck flow.
  status: {
    rechecking: "Re-checking DNS\u2026",
    verified: "Domain verified.",
    stillPropagating:
      "Still propagating \u2014 DNS records can take up to 24 hours to update.",
  },
  // BUG-AUTH-7: toast copy fired on a successful auto-recheck.
  // Used by the panel's `useToast()` call so SR + visual users
  // get a transient confirmation before the reveal auto-closes.
  successToast: {
    title: "Domain verified",
    description: "Your DNS TXT record was found and matched.",
  },
  // BUG-AUTH-7: how long the success state stays on screen before
  // the reveal auto-dismisses, so the user has time to read the
  // confirmation. Kept as a named constant so the test exercises
  // the same value the panel uses.
  autoDismissAfterMs: 1500,
} as const;
