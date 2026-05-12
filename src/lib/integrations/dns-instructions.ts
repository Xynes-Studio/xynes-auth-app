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
} as const;
