import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  LANDING_BRAND_HREF,
  LANDING_COOKIE_POLICY_URL,
  LANDING_EXTERNAL_LINKS,
  LANDING_FEATURES,
  LANDING_FOOTER_COLUMNS,
  LANDING_INTERNAL_LINKS,
  LANDING_TRUST,
  buildCmsConsoleHref,
  buildFooterColumns,
} from "@/lib/landing-copy";
import enUsLanding from "../../messages/en-US/auth.landing.json";
import enXaLanding from "../../messages/en-XA/auth.landing.json";

/**
 * Walks a nested object and returns every leaf key path joined by `.`.
 * Skips `_meta` / `_use` keys (translator-context comments).
 */
function leafKeys(node: unknown, prefix = ""): string[] {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    return [prefix];
  }
  const out: string[] = [];
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key.startsWith("_")) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    out.push(...leafKeys(value, path));
  }
  return out;
}

describe("LP-AUTH landing-copy (structural)", () => {
  it("freezes the brand / cookie / internal / external link sets", () => {
    expect(Object.isFrozen(LANDING_INTERNAL_LINKS)).toBe(true);
    expect(Object.isFrozen(LANDING_EXTERNAL_LINKS)).toBe(true);
    expect(Object.isFrozen(LANDING_FEATURES)).toBe(true);
    expect(Object.isFrozen(LANDING_FOOTER_COLUMNS)).toBe(true);
    expect(Object.isFrozen(LANDING_TRUST)).toBe(true);
  });

  it("uses safe internal-only links for auth-app routes", () => {
    expect(LANDING_INTERNAL_LINKS.login).toBe("/login");
    expect(LANDING_INTERNAL_LINKS.signup).toBe("/signup");
    expect(LANDING_INTERNAL_LINKS.forgotPassword).toBe("/forgot-password");
    expect(LANDING_INTERNAL_LINKS.security).toBe("/SECURITY.md");
  });

  it("builds a safe CMS Console link with localhost and production fallbacks", () => {
    try {
      // Tier 3 (non-production fallback): both env vars unset → localhost.
      vi.stubEnv("NEXT_PUBLIC_CMS_CONSOLE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_CONSOLE_URL", "");
      expect(buildCmsConsoleHref()).toBe("http://localhost:3000");

      // Tier 1 hit: the explicit LP-AUTH override is honoured.
      vi.stubEnv("NEXT_PUBLIC_CMS_CONSOLE_URL", "https://cms.xynes.com///");
      expect(buildCmsConsoleHref()).toBe("https://cms.xynes.com");

      // Tier 1 falls through to Tier 2 when the explicit value is a
      // hostile / non-http(s) scheme. The canonical var below must win.
      vi.stubEnv("NEXT_PUBLIC_CMS_CONSOLE_URL", "javascript:alert(1)");
      vi.stubEnv("NEXT_PUBLIC_CONSOLE_URL", "https://cms.staging.xynes.com");
      expect(buildCmsConsoleHref()).toBe("https://cms.staging.xynes.com");

      // Tier 1 falls all the way through to Tier 3 when both env vars are
      // hostile (Codex P2 defense in depth — no scheme leak).
      vi.stubEnv("NEXT_PUBLIC_CMS_CONSOLE_URL", "javascript:alert(1)");
      vi.stubEnv("NEXT_PUBLIC_CONSOLE_URL", "data:text/html,evil");
      vi.stubEnv("NODE_ENV", "production");
      expect(buildCmsConsoleHref()).toBe("https://cms.xynes.com");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("falls back to NEXT_PUBLIC_CONSOLE_URL when the explicit override is unset (Codex P2)", () => {
    // The auth-app's repo-wide convention is `NEXT_PUBLIC_CONSOLE_URL`
    // (used by WorkspaceSwitcher, InvitePreview, login, invites,
    // CreateWorkspaceForm, etc.). A hosted deployment that already sets
    // the canonical var must NOT need a second `NEXT_PUBLIC_CMS_CONSOLE_URL`
    // just to point the landing-page footer link at the right console.
    try {
      vi.stubEnv("NEXT_PUBLIC_CMS_CONSOLE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_CONSOLE_URL", "https://cms.xynes.com/");
      expect(buildCmsConsoleHref()).toBe("https://cms.xynes.com");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses the production fallback when NODE_ENV=production and both env vars are unset (Codex P2)", () => {
    // Closes the exact Codex P2 regression: hosted visitors must NEVER be
    // sent to `http://localhost:3000` when the CMS console env vars are
    // unset. The production literal is the only safe fallback.
    try {
      vi.stubEnv("NEXT_PUBLIC_CMS_CONSOLE_URL", "");
      vi.stubEnv("NEXT_PUBLIC_CONSOLE_URL", "");
      vi.stubEnv("NODE_ENV", "production");
      expect(buildCmsConsoleHref()).toBe("https://cms.xynes.com");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("explicit NEXT_PUBLIC_CMS_CONSOLE_URL wins over canonical NEXT_PUBLIC_CONSOLE_URL", () => {
    try {
      vi.stubEnv("NEXT_PUBLIC_CMS_CONSOLE_URL", "https://cms.preview.xynes.com");
      vi.stubEnv("NEXT_PUBLIC_CONSOLE_URL", "https://cms.xynes.com");
      expect(buildCmsConsoleHref()).toBe("https://cms.preview.xynes.com");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses an https GitHub URL for the OSS link", () => {
    expect(LANDING_TRUST.repoUrl).toMatch(
      /^https:\/\/github\.com\/Xynes-Studio\//,
    );
    expect(LANDING_EXTERNAL_LINKS.repoAuthSdk).toMatch(
      /^https:\/\/github\.com\/Xynes-Studio\//,
    );
  });

  it("never references attacker-controllable hosts", () => {
    const allUrls = [
      LANDING_BRAND_HREF,
      LANDING_COOKIE_POLICY_URL,
      ...Object.values(LANDING_INTERNAL_LINKS),
      ...Object.values(LANDING_EXTERNAL_LINKS),
      LANDING_TRUST.repoUrl,
      LANDING_TRUST.securityUrl,
    ];
    for (const url of allUrls) {
      expect(url).not.toMatch(/^javascript:/i);
      expect(url).not.toMatch(/^data:/i);
      expect(url).not.toMatch(/^vbscript:/i);
      expect(url).not.toMatch(/^\/\//);
    }
  });

  it("renders the AGPL-3.0 license literal expected by the trust strip", () => {
    expect(LANDING_TRUST.license).toBe("AGPL-3.0");
  });

  it("exposes exactly three feature cards with stable ordering", () => {
    expect(LANDING_FEATURES.map((f) => f.key)).toEqual([
      "workspaceScoped",
      "sso",
      "openSource",
    ]);
  });

  it("uses icon ids that are registered in @lumia-ui/icons default set", () => {
    const allowedIcons = new Set(["shield-check", "globe", "code"]);
    for (const f of LANDING_FEATURES) {
      expect(allowedIcons.has(f.icon)).toBe(true);
    }
  });
});

describe("LP-AUTH landing catalog parity", () => {
  it("en-US and en-XA carry the same key set", () => {
    const us = leafKeys(enUsLanding).sort();
    const xa = leafKeys(enXaLanding).sort();
    expect(xa).toEqual(us);
  });

  it("en-XA pseudo-locale wraps every leaf string", () => {
    // Pseudo-locale strings are wrapped in `[...]` brackets per @xynes/i18n.
    const sample = (enXaLanding as { hero: { headline: string } }).hero
      .headline;
    expect(sample.startsWith("[")).toBe(true);
    expect(sample.endsWith("]")).toBe(true);
  });

  it("each feature key in catalog matches the structural FEATURES list", () => {
    const catalogKeys = Object.keys(
      (enUsLanding as { features: Record<string, unknown> }).features,
    ).filter((k) => !k.startsWith("_") && k !== "ariaLabel");
    const structuralKeys = LANDING_FEATURES.map((f) => f.key);
    // Catalog may carry additional keys, but every structural key must exist.
    for (const k of structuralKeys) {
      expect(catalogKeys).toContain(k);
    }
  });

  it("catalog never carries raw secrets, tokens, hashes, or API key markers", () => {
    const enUsSerialized = JSON.stringify(enUsLanding);
    const enXaSerialized = JSON.stringify(enXaLanding);
    for (const serialized of [enUsSerialized, enXaSerialized]) {
      // Same hostile-pattern sweep used by `src/i18n/config.test.ts` and the
      // STORAGE-9 redaction tier.
      expect(serialized).not.toMatch(/xynes_live_/i);
      expect(serialized).not.toMatch(/AKIA[A-Z0-9]+/);
      expect(serialized).not.toMatch(/key_hash/i);
      expect(serialized).not.toMatch(/access_token/i);
      expect(serialized).not.toMatch(/api_key/i);
      expect(serialized).not.toMatch(/X-Amz-Signature/i);
      expect(serialized).not.toMatch(/European Union/i);
      expect(serialized).not.toMatch(/audit cadence/i);
    }
  });
});

describe("buildFooterColumns", () => {
  it("calls the translator for every column heading and link label", () => {
    const calls: string[] = [];
    const translator = (key: string) => {
      calls.push(key);
      return `translated:${key}`;
    };
    const cols = buildFooterColumns(translator);
    expect(cols.length).toBe(LANDING_FOOTER_COLUMNS.length);
    // Heading key for each column must have been requested.
    for (const col of LANDING_FOOTER_COLUMNS) {
      expect(calls).toContain(col.headingKey);
      for (const link of col.links) {
        expect(calls).toContain(link.labelKey);
      }
    }
    // Links must preserve the structural href + external flag.
    expect(cols[0].links[0].href).toBe("/login");
    expect(cols[0].links[3]).toEqual(
      expect.objectContaining({
        label: "translated:footer.columns.product.cmsConsole",
        href: "http://localhost:3000",
        external: true,
        id: "footer-cms-console",
      }),
    );
  });

  it("preserves the structural href even if the translator returns a hostile string", () => {
    // Defense in depth: a hostile catalog (translator returns javascript:)
    // must NEVER mutate the structural href. We check the full
    // dangerous-scheme triad here (javascript: / data: / vbscript:) plus
    // protocol-relative URLs, matching the CodeQL `js/incomplete-url-scheme-check`
    // requirement (alert #12 on the PR).
    const hostile = () => "javascript:alert(1)";
    const cols = buildFooterColumns(hostile);
    for (const col of cols) {
      for (const link of col.links) {
        // The structural href is the literal we control — never the
        // translator output.
        const href = link.href.toLowerCase().trim();
        expect(href.startsWith("javascript:")).toBe(false);
        expect(href.startsWith("data:")).toBe(false);
        expect(href.startsWith("vbscript:")).toBe(false);
        expect(href.startsWith("//")).toBe(false);
      }
    }
  });
});

describe("SECURITY.md mirror parity (LP-AUTH)", () => {
  it("repo-root SECURITY.md and public/SECURITY.md are byte-identical", () => {
    const root = resolve(__dirname, "../../SECURITY.md");
    const pub = resolve(__dirname, "../../public/SECURITY.md");
    const rootBytes = readFileSync(root);
    const pubBytes = readFileSync(pub);
    expect(rootBytes.equals(pubBytes)).toBe(true);
  });
});
