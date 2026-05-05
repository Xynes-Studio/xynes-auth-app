import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import { vi } from "vitest";
import type { ImgHTMLAttributes } from "react";

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
process.env.NEXT_PUBLIC_API_URL = "https://api.test.com";
process.env.NEXT_PUBLIC_APP_URL = "https://auth.test.com";
process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS =
  "xynes.com,localhost:3000,localhost:3001";

// Default test behavior assumes in-app navigation.
// Individual tests can opt into external console redirects by setting this.
process.env.NEXT_PUBLIC_CONSOLE_URL = "";
process.env.NEXT_PUBLIC_CMS_CONSOLE_URL = "";

vi.mock(
  "@lumia-ui/icons",
  () => ({
    Icon: () => null,
    getIcon: () => undefined,
    registerIcon: () => undefined,
  }),
);

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    return createElement("img", props);
  },
}));
