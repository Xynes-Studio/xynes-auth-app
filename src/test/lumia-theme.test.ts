// @vitest-environment node
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import postcss from "postcss";
import tailwindcss from "tailwindcss";

const require = createRequire(import.meta.url);
const config = require("../../tailwind.config.js");

describe("Lumia semantic theme utilities", () => {
  it("gives native primary CTAs the shared contrasting foreground", async () => {
    const result = await postcss([
      tailwindcss({
        ...config,
        content: [{ raw: "text-primary-foreground" }],
      }),
    ]).process("@tailwind utilities;", { from: undefined });

    const colors: string[] = [];
    result.root.walkDecls("color", (declaration) => {
      colors.push(declaration.value);
    });
    expect(colors).toEqual(["var(--colors-on-primary, #ffffff)"]);
  });

  it("retains Lumia button hover and active opacity utilities", async () => {
    const result = await postcss([
      tailwindcss({
        ...config,
        content: [{ raw: "hover:bg-primary/90 active:bg-primary/80" }],
      }),
    ]).process("@tailwind utilities;", { from: undefined });

    const backgrounds: string[] = [];
    result.root.walkDecls("background-color", (declaration) => {
      backgrounds.push(declaration.value);
    });
    expect(backgrounds).toHaveLength(2);
    expect(backgrounds.some((value) => value.includes("0.9"))).toBe(true);
    expect(backgrounds.some((value) => value.includes("0.8"))).toBe(true);
  });

  it("lets shared theme variables control compiled app and button colors", async () => {
    const result = await postcss([
      tailwindcss({
        ...config,
        content: [{ raw: "bg-background text-foreground bg-primary" }],
      }),
    ]).process("@tailwind utilities;", { from: undefined });

    const declarations = new Map<string, string>();
    result.root.walkRules((rule) => {
      rule.walkDecls((declaration) => {
        declarations.set(`${rule.selector}:${declaration.prop}`, declaration.value);
      });
    });

    expect(declarations.get(".bg-background:background-color")).toContain(
      "var(--colors-background",
    );
    expect(declarations.get(".text-foreground:color")).toContain(
      "var(--colors-foreground",
    );
    expect(declarations.get(".bg-primary:background-color")).toContain(
      "var(--colors-primary",
    );
  });
});
