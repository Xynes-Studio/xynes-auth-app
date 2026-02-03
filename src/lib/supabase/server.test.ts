import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "./server";

const mockCreateServerClient = vi.fn();
const mockCookies = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

vi.mock("next/headers", () => ({
  cookies: () => mockCookies(),
}));

describe("supabase server client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCookies.mockReturnValue({
      getAll: () => [],
      set: vi.fn(),
    });
  });

  it("should prefer SUPABASE_URL when set", async () => {
    process.env.SUPABASE_URL = "http://server.supabase.local";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://public.supabase.local";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

    await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "http://server.supabase.local",
      "test-key",
      expect.any(Object)
    );
  });

  it("should fall back to NEXT_PUBLIC_SUPABASE_URL when SUPABASE_URL is missing", async () => {
    delete process.env.SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://public.supabase.local";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";

    await createClient();

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "http://public.supabase.local",
      "test-key",
      expect.any(Object)
    );
  });
});

