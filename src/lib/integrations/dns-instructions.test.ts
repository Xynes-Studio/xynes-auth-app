import { describe, expect, it } from "vitest";

import {
  DNS_INSTRUCTION_COPY,
  deriveSubdomainOnlyName,
} from "./dns-instructions";

// Contract:
//
// The helper computes the subdomain-only label by stripping `.${hostname}`
// from the FQDN exactly. The row's `hostname` acts as the zone boundary
// because that is the only piece of information we have — we don't know
// which DNS zone the user's provider actually serves (Cloudflare etc. may
// have a zone at the apex or at the claimed hostname itself).
//
// Most DNS providers expose a zone at the user's registered/claimed
// domain, so stripping the row's hostname is the safest deterministic
// rule: it never invents a label that doesn't exist in the FQDN, never
// requires an eTLD+1 lookup, and never crashes on weird hostnames.

describe("deriveSubdomainOnlyName (WSA-FIX-3)", () => {
  it("returns the bare `_xynes` label for an apex hostname", () => {
    expect(deriveSubdomainOnlyName("_xynes.example.com", "example.com")).toBe(
      "_xynes",
    );
  });

  it("returns the bare `_xynes` label when the user added a subdomain as the row's hostname", () => {
    // Row hostname is `sub.example.com` (the user's claimed domain); the
    // verify handler produced `_xynes.sub.example.com`. Stripping the
    // hostname yields `_xynes` — providers managing a zone at
    // `sub.example.com` will accept this directly.
    expect(
      deriveSubdomainOnlyName("_xynes.sub.example.com", "sub.example.com"),
    ).toBe("_xynes");
  });

  it("returns the bare `_xynes` label when the user added a deep subdomain", () => {
    expect(
      deriveSubdomainOnlyName(
        "_xynes.deep.sub.example.com",
        "deep.sub.example.com",
      ),
    ).toBe("_xynes");
  });

  it("falls back to the full FQDN when the verificationName does not end in the hostname (defensive)", () => {
    // Pathological row shape — should not happen with the current
    // verify handler, but the panel must never crash or render an
    // empty string. Returning the canonical FQDN is the safe fallback.
    expect(
      deriveSubdomainOnlyName(
        "_xynes.example.com",
        "different-hostname.example.com",
      ),
    ).toBe("_xynes.example.com");
  });

  it("returns the verificationName unchanged when the two inputs are identical", () => {
    // Edge case: equal inputs would otherwise produce an empty
    // subdomain label. Render the full string instead.
    expect(deriveSubdomainOnlyName("example.com", "example.com")).toBe(
      "example.com",
    );
  });

  it("returns an empty string when both inputs are empty (defense in depth)", () => {
    expect(deriveSubdomainOnlyName("", "")).toBe("");
  });

  it("returns the verificationName when the hostname is empty", () => {
    expect(deriveSubdomainOnlyName("_xynes.example.com", "")).toBe(
      "_xynes.example.com",
    );
  });

  it("does not throw or render undefined for missing verificationName", () => {
    // `verificationName` is required on the type, but JS callers can
    // technically pass `undefined`. The helper must not crash.
    expect(
      deriveSubdomainOnlyName(undefined as unknown as string, "example.com"),
    ).toBe("");
  });

  it("never produces an empty string when the FQDN equals `.${hostname}` (defensive)", () => {
    // Pathological row: subdomain peel would produce "". Helper must
    // fall back to the full input so the rendered label is non-empty.
    expect(deriveSubdomainOnlyName(".example.com", "example.com")).toBe(
      ".example.com",
    );
  });
});

describe("DNS_INSTRUCTION_COPY (WSA-FIX-3)", () => {
  it("exposes stable type / TTL / heading / disclosure strings", () => {
    expect(DNS_INSTRUCTION_COPY.type).toBe("TXT");
    expect(DNS_INSTRUCTION_COPY.ttl).toMatch(/300|Auto/);
    expect(DNS_INSTRUCTION_COPY.helperHeading).toMatch(/two fields/i);
    expect(DNS_INSTRUCTION_COPY.disclosureLabel).toMatch(/where do i add/i);
  });

  it("ships a non-empty provider notes list (at least Cloudflare + Route 53 + Namecheap)", () => {
    expect(DNS_INSTRUCTION_COPY.providerNotes.length).toBeGreaterThanOrEqual(3);
    const joined = DNS_INSTRUCTION_COPY.providerNotes.join("\n");
    expect(joined).toMatch(/cloudflare/i);
    expect(joined).toMatch(/route 53/i);
    expect(joined).toMatch(/namecheap/i);
  });

  it("uses an https docs URL", () => {
    expect(DNS_INSTRUCTION_COPY.docsHref.startsWith("https://")).toBe(true);
  });

  it("exposes status copy for the auto-recheck flow", () => {
    expect(DNS_INSTRUCTION_COPY.status.rechecking).toMatch(/re-?checking/i);
    expect(DNS_INSTRUCTION_COPY.status.verified).toMatch(/verified/i);
    expect(DNS_INSTRUCTION_COPY.status.stillPropagating).toMatch(
      /propagating|24 hours/i,
    );
  });
});
