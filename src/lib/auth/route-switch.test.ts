import { describe, expect, it } from "vitest";
import {
  getAuthRouteVariant,
  isAuthRouteActive,
  type AuthRouteVariant,
} from "./route-switch";

describe("route-switch", () => {
  describe("getAuthRouteVariant", () => {
    it.each<[string, AuthRouteVariant]>([
      ["/login", "login"],
      ["/login?redirect=/workspaces", "login"],
      ["/signup", "signup"],
      ["/sign-up", "signup"],
      ["/signup/complete", "signup"],
      ["/forgot-password", "login"],
      ["/", "login"],
    ])("maps %s to %s", (pathname, expected) => {
      expect(getAuthRouteVariant(pathname)).toBe(expected);
    });
  });

  describe("isAuthRouteActive", () => {
    it("returns true only for the active route variant", () => {
      expect(isAuthRouteActive("/login", "login")).toBe(true);
      expect(isAuthRouteActive("/login", "signup")).toBe(false);
      expect(isAuthRouteActive("/signup", "signup")).toBe(true);
      expect(isAuthRouteActive("/signup", "login")).toBe(false);
    });
  });
});
