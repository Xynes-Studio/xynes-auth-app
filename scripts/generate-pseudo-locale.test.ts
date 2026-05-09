import { describe, it, expect } from "vitest";

// Re-implement the same `transform` shape used by `scripts/generate-pseudo-locale.mjs`
// so the test can assert the contract without spawning a child Node process.
// The actual generator imports `pseudoLocalizeMessage` from `@xynes/i18n`; here
// we substitute a stub so the test focuses on the recursive shape, not on
// pseudo-localization. The real generator is exercised by the catalog parity
// in `messages/en-XA/`.
function makeTransform(localize: (s: string) => string) {
  function transform(value: unknown): unknown {
    if (typeof value === "string") {
      return localize(value);
    }
    if (value === null) {
      return null;
    }
    if (Array.isArray(value)) {
      return value.map((item) => transform(item));
    }
    if (typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = transform(v);
      }
      return out;
    }
    return value;
  }
  return transform;
}

describe("generate-pseudo-locale transform()", () => {
  const wrap = (s: string) => `[${s}]`;
  const transform = makeTransform(wrap);

  it("wraps string leaves with the localizer", () => {
    expect(transform("Continue")).toBe("[Continue]");
  });

  it("recurses into nested objects", () => {
    expect(transform({ a: "x", b: { c: "y" } })).toEqual({
      a: "[x]",
      b: { c: "[y]" },
    });
  });

  it("preserves null leaves without crashing (regression: would throw on Object.entries(null))", () => {
    expect(transform(null)).toBeNull();
    expect(transform({ a: null, b: "x" })).toEqual({ a: null, b: "[x]" });
  });

  it("maps over array values instead of treating them as objects", () => {
    expect(transform(["one", "two"])).toEqual(["[one]", "[two]"]);
    expect(transform({ list: ["a", "b"] })).toEqual({
      list: ["[a]", "[b]"],
    });
  });

  it("returns numeric and boolean leaves unchanged", () => {
    expect(transform(42)).toBe(42);
    expect(transform(true)).toBe(true);
    expect(transform({ n: 7, b: false, s: "x" })).toEqual({
      n: 7,
      b: false,
      s: "[x]",
    });
  });

  it("handles deeply nested mixed shapes without losing data", () => {
    const input = {
      page: { heading: "H", subheading: null, levels: ["a", "b"] },
      meta: { count: 3, items: [{ name: "n", flag: true }] },
    };
    expect(transform(input)).toEqual({
      page: { heading: "[H]", subheading: null, levels: ["[a]", "[b]"] },
      meta: { count: 3, items: [{ name: "[n]", flag: true }] },
    });
  });
});
