/**
 * Workspace Validation Tests
 *
 * Unit tests for workspace validation pure functions.
 * Following Tier 1 testing standards with 100% coverage target.
 *
 * @module workspace/validation.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  validateWorkspaceName,
  validateWorkspaceSlug,
  generateSlugFromName,
  debounce,
  getSlugStatusMessage,
  NAME_CONSTRAINTS,
  SLUG_CONSTRAINTS,
} from "./validation";

describe("validateWorkspaceName", () => {
  describe("valid names", () => {
    it("should accept a valid workspace name", () => {
      const result = validateWorkspaceName("My Workspace");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept minimum length name", () => {
      const result = validateWorkspaceName("Ab");
      expect(result.isValid).toBe(true);
    });

    it("should accept maximum length name", () => {
      const name = "a".repeat(NAME_CONSTRAINTS.MAX_LENGTH);
      const result = validateWorkspaceName(name);
      expect(result.isValid).toBe(true);
    });

    it("should trim whitespace and validate", () => {
      const result = validateWorkspaceName("  My Workspace  ");
      expect(result.isValid).toBe(true);
    });

    it("should accept names with special characters", () => {
      const result = validateWorkspaceName("Acme Corp. (2024)");
      expect(result.isValid).toBe(true);
    });

    it("should accept names with unicode characters", () => {
      const result = validateWorkspaceName("Xynes スタジオ");
      expect(result.isValid).toBe(true);
    });
  });

  describe("invalid names", () => {
    it("should reject empty string", () => {
      const result = validateWorkspaceName("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Workspace name is required");
    });

    it("should reject whitespace-only string", () => {
      const result = validateWorkspaceName("   ");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Workspace name is required");
    });

    it("should reject null/undefined coerced to empty", () => {
      // @ts-expect-error - testing edge case
      const result = validateWorkspaceName(null);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Workspace name is required");
    });

    it("should reject name shorter than minimum", () => {
      const result = validateWorkspaceName("A");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        `Workspace name must be at least ${NAME_CONSTRAINTS.MIN_LENGTH} characters`
      );
    });

    it("should reject name longer than maximum", () => {
      const name = "a".repeat(NAME_CONSTRAINTS.MAX_LENGTH + 1);
      const result = validateWorkspaceName(name);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        `Workspace name must be at most ${NAME_CONSTRAINTS.MAX_LENGTH} characters`
      );
    });
  });
});

describe("validateWorkspaceSlug", () => {
  describe("valid slugs", () => {
    it("should accept a valid simple slug", () => {
      const result = validateWorkspaceSlug("my-workspace");
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should accept minimum length slug", () => {
      const result = validateWorkspaceSlug("abc");
      expect(result.isValid).toBe(true);
    });

    it("should accept maximum length slug", () => {
      const slug = "a" + "b".repeat(SLUG_CONSTRAINTS.MAX_LENGTH - 1);
      const result = validateWorkspaceSlug(slug);
      expect(result.isValid).toBe(true);
    });

    it("should accept slug with numbers", () => {
      const result = validateWorkspaceSlug("team-123");
      expect(result.isValid).toBe(true);
    });

    it("should accept slug with multiple hyphens (non-consecutive)", () => {
      const result = validateWorkspaceSlug("my-awesome-team");
      expect(result.isValid).toBe(true);
    });

    it("should accept slug ending with number", () => {
      const result = validateWorkspaceSlug("project-2024");
      expect(result.isValid).toBe(true);
    });
  });

  describe("invalid slugs", () => {
    it("should reject empty string", () => {
      const result = validateWorkspaceSlug("");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Workspace URL is required");
    });

    it("should reject slug shorter than minimum", () => {
      const result = validateWorkspaceSlug("ab");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        `Must be at least ${SLUG_CONSTRAINTS.MIN_LENGTH} characters`
      );
    });

    it("should reject slug longer than maximum", () => {
      const slug = "a".repeat(SLUG_CONSTRAINTS.MAX_LENGTH + 1);
      const result = validateWorkspaceSlug(slug);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        `Must be at most ${SLUG_CONSTRAINTS.MAX_LENGTH} characters`
      );
    });

    it("should reject uppercase letters", () => {
      const result = validateWorkspaceSlug("MyWorkspace");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Must be lowercase only");
    });

    it("should reject slug starting with number", () => {
      const result = validateWorkspaceSlug("123-team");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Must start with a letter");
    });

    it("should reject slug starting with hyphen", () => {
      const result = validateWorkspaceSlug("-my-team");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Must start with a letter");
    });

    it("should reject consecutive hyphens", () => {
      const result = validateWorkspaceSlug("my--team");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Cannot contain consecutive hyphens");
    });

    it("should reject slug ending with hyphen", () => {
      const result = validateWorkspaceSlug("my-team-");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Cannot end with a hyphen");
    });

    it("should reject special characters", () => {
      const result = validateWorkspaceSlug("my_team");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Can only contain lowercase letters, numbers, and hyphens"
      );
    });

    it("should reject spaces", () => {
      const result = validateWorkspaceSlug("my team");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Can only contain lowercase letters, numbers, and hyphens"
      );
    });

    it("should reject dots", () => {
      const result = validateWorkspaceSlug("my.team");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Can only contain lowercase letters, numbers, and hyphens"
      );
    });
  });
});

describe("generateSlugFromName", () => {
  describe("basic transformations", () => {
    it("should convert to lowercase", () => {
      expect(generateSlugFromName("My Workspace")).toBe("my-workspace");
    });

    it("should replace spaces with hyphens", () => {
      expect(generateSlugFromName("my workspace")).toBe("my-workspace");
    });

    it("should replace underscores with hyphens", () => {
      expect(generateSlugFromName("my_workspace")).toBe("my-workspace");
    });

    it("should replace multiple spaces with single hyphen", () => {
      expect(generateSlugFromName("my   workspace")).toBe("my-workspace");
    });

    it("should remove special characters", () => {
      expect(generateSlugFromName("Acme Corp. (2024)")).toBe("acme-corp-2024");
    });

    it("should handle mixed case and special chars", () => {
      expect(generateSlugFromName("My Awesome Team!")).toBe("my-awesome-team");
    });
  });

  describe("edge cases", () => {
    it("should return empty string for empty input", () => {
      expect(generateSlugFromName("")).toBe("");
    });

    it("should return empty string for null/undefined", () => {
      // @ts-expect-error - testing edge case
      expect(generateSlugFromName(null)).toBe("");
      // @ts-expect-error - testing edge case
      expect(generateSlugFromName(undefined)).toBe("");
    });

    it("should remove leading hyphens", () => {
      expect(generateSlugFromName("---my-team")).toBe("my-team");
    });

    it("should remove trailing hyphens", () => {
      expect(generateSlugFromName("my-team---")).toBe("my-team");
    });

    it("should collapse consecutive hyphens", () => {
      expect(generateSlugFromName("my - - team")).toBe("my-team");
    });

    it("should prepend w- if starts with number", () => {
      expect(generateSlugFromName("2024 Team")).toBe("w-2024-team");
    });

    it("should truncate to max length", () => {
      const longName = "a".repeat(100);
      const result = generateSlugFromName(longName);
      expect(result.length).toBeLessThanOrEqual(SLUG_CONSTRAINTS.MAX_LENGTH);
    });

    it("should not end with hyphen after truncation", () => {
      const nameWithHyphenAtBoundary = "a".repeat(49) + "-b";
      const result = generateSlugFromName(nameWithHyphenAtBoundary);
      expect(result.endsWith("-")).toBe(false);
    });

    it("should handle unicode characters by removing them", () => {
      expect(generateSlugFromName("Xynes スタジオ")).toBe("xynes");
    });

    it("should handle emoji by removing them", () => {
      expect(generateSlugFromName("Rocket 🚀 Team")).toBe("rocket-team");
    });
  });

  describe("real-world examples", () => {
    it.each([
      ["Acme Corporation", "acme-corporation"],
      ["My Personal Project", "my-personal-project"],
      ["Team Alpha (Dev)", "team-alpha-dev"],
      ["2024 Q1 Planning", "w-2024-q1-planning"],
      ["John's Workspace", "johns-workspace"],
      ["Test & Development", "test-development"],
      ["  Trimmed Spaces  ", "trimmed-spaces"],
    ])('should convert "%s" to "%s"', (input, expected) => {
      expect(generateSlugFromName(input)).toBe(expected);
    });
  });
});

describe("debounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("should delay function execution", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn("test");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(299);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledWith("test");
  });

  it("should cancel previous call when called again", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 300);

    debouncedFn("first");
    vi.advanceTimersByTime(200);

    debouncedFn("second");
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("second");
  });

  it("should handle multiple rapid calls", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn("a");
    debouncedFn("b");
    debouncedFn("c");
    debouncedFn("d");

    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("d");
  });

  it("should allow multiple calls after debounce completes", () => {
    const fn = vi.fn();
    const debouncedFn = debounce(fn, 100);

    debouncedFn("first");
    vi.advanceTimersByTime(100);

    debouncedFn("second");
    vi.advanceTimersByTime(100);

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn).toHaveBeenNthCalledWith(1, "first");
    expect(fn).toHaveBeenNthCalledWith(2, "second");
  });
});

describe("getSlugStatusMessage", () => {
  it('should return empty string for "idle" status', () => {
    expect(getSlugStatusMessage("idle", "my-team")).toBe("");
  });

  it('should return checking message for "checking" status', () => {
    expect(getSlugStatusMessage("checking", "my-team")).toBe(
      "Checking availability..."
    );
  });

  it('should return available message for "available" status', () => {
    expect(getSlugStatusMessage("available", "my-team")).toBe(
      '"my-team" is available!'
    );
  });

  it('should return unavailable message for "unavailable" status', () => {
    expect(getSlugStatusMessage("unavailable", "my-team")).toBe(
      '"my-team" is already taken'
    );
  });

  it('should return error message for "error" status', () => {
    expect(getSlugStatusMessage("error", "my-team")).toBe(
      "Could not check availability. Please try again."
    );
  });
});
