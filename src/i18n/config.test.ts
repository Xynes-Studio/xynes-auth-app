import { describe, it, expect } from "vitest";
import {
  AUTH_LOCALE_COOKIE,
  getAuthMessages,
  resolveAuthLocale,
} from "./config";

describe("auth i18n config", () => {
  describe("AUTH_LOCALE_COOKIE", () => {
    it("matches the canonical xynes_locale cookie name", () => {
      // Shared with the CMS console — must remain stable so a single locale
      // selection is honored across all Xynes frontends.
      expect(AUTH_LOCALE_COOKIE).toBe("xynes_locale");
    });
  });

  describe("resolveAuthLocale", () => {
    it("returns en-US by default when no input is provided", () => {
      expect(resolveAuthLocale()).toBe("en-US");
    });

    it("honors a supported cookie value", () => {
      expect(resolveAuthLocale({ cookieLocale: "en-XA" })).toBe("en-XA");
    });

    it("falls closed to en-US for unsupported cookie values", () => {
      expect(resolveAuthLocale({ cookieLocale: "fr-FR" })).toBe("en-US");
    });

    it("ignores hostile inputs and falls closed to en-US", () => {
      expect(resolveAuthLocale({ cookieLocale: "../etc/passwd" })).toBe(
        "en-US",
      );
      expect(resolveAuthLocale({ cookieLocale: "javascript:alert(1)" })).toBe(
        "en-US",
      );
      expect(resolveAuthLocale({ cookieLocale: 123 as unknown })).toBe("en-US");
    });

    it("honors Accept-Language when no cookie is present", () => {
      expect(
        resolveAuthLocale({
          acceptLanguage: "en-XA,en-US;q=0.9",
        }),
      ).toBe("en-XA");
    });

    it("prioritizes cookie over Accept-Language", () => {
      expect(
        resolveAuthLocale({
          cookieLocale: "en-US",
          acceptLanguage: "en-XA",
        }),
      ).toBe("en-US");
    });
  });

  describe("getAuthMessages", () => {
    it("returns the en-US catalog as the default fallback", () => {
      const messages = getAuthMessages("invalid-locale");
      expect(messages.auth.common.appName).toBe("Xynes Auth");
      expect(messages.auth.login.submit).toBe("Continue");
    });

    it("returns the en-XA pseudo-locale catalog when requested", () => {
      const messages = getAuthMessages("en-XA");
      // The pseudo-localizer wraps text in [..] and doubles characters.
      expect(messages.auth.login.submit).toMatch(/\[CCoonnttiinnuuee\]/);
      expect(messages.auth.workspaces.selector.emptyTitle).toMatch(
        /\[NNoo wwoorrkkssppaacceess ffoouunndd\]/,
      );
    });

    it("never returns undefined for any supported locale", () => {
      for (const locale of ["en-US", "en-XA"] as const) {
        const messages = getAuthMessages(locale);
        expect(messages).toBeDefined();
        expect(messages.auth).toBeDefined();
        expect(messages.auth.common).toBeDefined();
        expect(messages.auth.dashboard).toBeDefined();
        expect(messages.auth.errors).toBeDefined();
        expect(messages.auth.login).toBeDefined();
        expect(messages.auth.signup).toBeDefined();
        expect(messages.auth.forgotPassword).toBeDefined();
        expect(messages.auth.resetPassword).toBeDefined();
        expect(messages.auth.invite).toBeDefined();
        expect(messages.auth.workspaces).toBeDefined();
      }
    });

    it("does not expose secret-shaped keys in the message tree", () => {
      const messages = getAuthMessages("en-US");
      const serialized = JSON.stringify(messages);
      // Defense-in-depth: catalogs must never surface tokens, hashes, or
      // raw API key markers.
      expect(serialized).not.toMatch(/xynes_live_/);
      expect(serialized).not.toMatch(/key_hash/i);
      expect(serialized).not.toMatch(/access[_-]?token/i);
      expect(serialized).not.toMatch(/api[_-]?key/i);
    });
  });
});
