import { describe, it, expect } from "vitest";
import { isAccountEnumerationSensitiveResetError } from "./password-reset-utils";

describe("isAccountEnumerationSensitiveResetError", () => {
  it("should treat 'User not found' as enumeration-sensitive", () => {
    expect(
      isAccountEnumerationSensitiveResetError({ message: "User not found" })
    ).toBe(true);
  });

  it("should treat 404 as enumeration-sensitive", () => {
    expect(isAccountEnumerationSensitiveResetError({ status: 404 })).toBe(true);
  });

  it("should not treat other errors as enumeration-sensitive", () => {
    expect(
      isAccountEnumerationSensitiveResetError({ message: "Network error", status: 500 })
    ).toBe(false);
  });
});

