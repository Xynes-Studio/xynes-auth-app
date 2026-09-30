import { afterEach, describe, it, expect, vi } from "vitest";
import { getEffectiveOrigin } from "./origin";

describe("getEffectiveOrigin", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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

  it("uses only the first forwarded host and protocol values", () => {
    const headers = new Headers({
      "x-forwarded-host": "localhost:3100, evil.example",
      "x-forwarded-proto": "https, javascript",
    });

    expect(getEffectiveOrigin("http://localhost:3000/logout", headers)).toBe(
      "https://localhost:3100",
    );
  });

  it("rejects credential and path syntax in forwarded hosts", () => {
    expect(
      getEffectiveOrigin(
        "http://localhost:3000/logout",
        new Headers({
          host: "localhost:3000",
          "x-forwarded-host": "user@localhost:3100",
        }),
      ),
    ).toBe("http://localhost:3000");
    expect(
      getEffectiveOrigin(
        "http://localhost:3000/logout",
        new Headers({
          host: "localhost:3000",
          "x-forwarded-host": "localhost:3100/path",
        }),
      ),
    ).toBe("http://localhost:3000");
  });

  it("allows loopback IPv4 with a port in local environments", () => {
    expect(
      getEffectiveOrigin(
        "http://localhost:3000/logout",
        new Headers({
          "x-forwarded-host": "127.0.0.1:3100",
          "x-forwarded-proto": "http",
        }),
      ),
    ).toBe("http://127.0.0.1:3100");
  });

  it("allows only the Xynes apex and subdomains in production", () => {
    vi.stubEnv("NODE_ENV", "production");

    expect(
      getEffectiveOrigin(
        "https://internal.invalid/logout",
        new Headers({ "x-forwarded-host": "auth.xynes.com" }),
      ),
    ).toBe("https://auth.xynes.com");
    expect(
      getEffectiveOrigin(
        "https://xynes.com/logout",
        new Headers({ host: "xynes.com" }),
      ),
    ).toBe("https://xynes.com");
    expect(
      getEffectiveOrigin(
        "https://auth.xynes.com/logout",
        new Headers({ "x-forwarded-host": "xynes.com.evil.example" }),
      ),
    ).toBe("https://auth.xynes.com");
  });

  it("falls back to the request protocol when the forwarded protocol is unsafe", () => {
    expect(
      getEffectiveOrigin(
        "https://localhost:3000/logout",
        new Headers({
          "x-forwarded-host": "localhost:3100",
          "x-forwarded-proto": "javascript",
        }),
      ),
    ).toBe("https://localhost:3100");
  });

  it("recognizes bracketed IPv6 syntax without trusting an unallowlisted host", () => {
    expect(
      getEffectiveOrigin(
        "http://localhost:3000/logout",
        new Headers({ "x-forwarded-host": "[::1]:3100" }),
      ),
    ).toBe("http://localhost:3000");
  });

  it("uses environment-safe protocols for non-HTTP request URLs", () => {
    expect(getEffectiveOrigin("ftp://localhost:3000/logout", new Headers())).toBe(
      "http://localhost:3000",
    );

    vi.stubEnv("NODE_ENV", "production");
    expect(
      getEffectiveOrigin("ftp://auth.xynes.com/logout", new Headers()),
    ).toBe("https://auth.xynes.com");
  });

  it("retains the parsed request host when no header candidate is allowlisted", () => {
    expect(
      getEffectiveOrigin("http://outside.example/logout", new Headers()),
    ).toBe("http://outside.example");
  });
});
