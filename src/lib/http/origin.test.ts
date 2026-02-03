import { describe, it, expect } from "vitest";
import { getEffectiveOrigin } from "./origin";

describe("getEffectiveOrigin", () => {
  it("uses allowed forwarded host/proto when behind a proxy", () => {
    const headers = new Headers({
      host: "localhost:3000",
      "x-forwarded-host": "localhost:3100",
      "x-forwarded-proto": "http",
    });

    expect(getEffectiveOrigin("http://localhost:3000/logout", headers)).toBe(
      "http://localhost:3100",
    );
  });

  it("ignores disallowed forwarded host and falls back safely", () => {
    const headers = new Headers({
      host: "localhost:3000",
      "x-forwarded-host": "evil.example",
      "x-forwarded-proto": "https",
    });

    expect(getEffectiveOrigin("http://localhost:3000/logout", headers)).toBe(
      "http://localhost:3000",
    );
  });

  it("falls back to request URL host when headers are malformed", () => {
    const headers = new Headers({
      host: "local host:3000",
      "x-forwarded-host": "localhost:3100/path",
    });

    expect(getEffectiveOrigin("http://localhost:3000/logout", headers)).toBe(
      "http://localhost:3000",
    );
  });
});
