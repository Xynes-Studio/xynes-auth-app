import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSupabaseJsCreateClient = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockSupabaseJsCreateClient(...args),
}));

// Prevent accidental real client creation in this unit test.
vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(),
}));

import { createPasswordResetClient } from "./client";

describe("createPasswordResetClient", () => {
  beforeEach(() => {
    mockSupabaseJsCreateClient.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
  });

  it("uses implicit flow so password reset links don't depend on a PKCE verifier", () => {
    createPasswordResetClient();

    expect(mockSupabaseJsCreateClient).toHaveBeenCalledWith(
      "http://127.0.0.1:54321",
      "anon",
      expect.objectContaining({
        auth: expect.objectContaining({
          flowType: "implicit",
        }),
      })
    );
  });
});

