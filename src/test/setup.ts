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

vi.mock("@lumia-ui/icons", () => ({
  Icon: () => null,
  getIcon: () => undefined,
  registerIcon: () => undefined,
}));

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => {
    return createElement("img", props);
  },
}));

// Global next-intl mock: the auth pilot wires next-intl in production via
// `NextIntlClientProvider`, but unit tests render components in isolation
// without the provider tree. We resolve translation keys against the actual
// en-US catalogs so existing test assertions (which assert the canonical
// English copy via accessible names / regex) remain valid after the
// translation refactor. Tests that need to assert pseudo-locale rendering
// must wrap the component in a real `NextIntlClientProvider` and rely on
// next-intl's actual behavior.
vi.mock("next-intl", async () => {
  const [
    common,
    dashboard,
    errors,
    login,
    signup,
    forgot,
    reset,
    invite,
    landing,
    onboarding,
    profile,
    integrations,
    workspaces,
  ] = await Promise.all([
    import("../../messages/en-US/auth.common.json"),
    import("../../messages/en-US/auth.dashboard.json"),
    import("../../messages/en-US/auth.errors.json"),
    import("../../messages/en-US/auth.login.json"),
    import("../../messages/en-US/auth.signup.json"),
    import("../../messages/en-US/auth.forgot-password.json"),
    import("../../messages/en-US/auth.reset-password.json"),
    import("../../messages/en-US/auth.invite.json"),
    import("../../messages/en-US/auth.landing.json"),
    import("../../messages/en-US/auth.onboarding.json"),
    import("../../messages/en-US/auth.profile.json"),
    import("../../messages/en-US/auth.integrations.json"),
    import("../../messages/en-US/auth.workspaces.json"),
  ]);

  const messages = {
    auth: {
      common: common.default,
      dashboard: dashboard.default,
      errors: errors.default,
      login: login.default,
      signup: signup.default,
      forgotPassword: forgot.default,
      resetPassword: reset.default,
      invite: invite.default,
      landing: landing.default,
      onboarding: onboarding.default,
      profile: profile.default,
      integrations: integrations.default,
      workspaces: workspaces.default,
    },
  } as const;

  type CatalogValue = string | { [key: string]: CatalogValue };

  function resolve(node: CatalogValue | undefined, path: string): string {
    const segments = path.split(".");
    let current: CatalogValue | undefined = node;
    for (const segment of segments) {
      if (current && typeof current === "object" && segment in current) {
        current = (current as Record<string, CatalogValue>)[segment];
      } else {
        return path;
      }
    }
    return typeof current === "string" ? current : path;
  }

  function applyValues(template: string, values?: Record<string, unknown>) {
    if (!values) return template;
    return template.replace(/\{(\w+)\}/g, (match, key: string) => {
      const v = values[key];
      return v === undefined || v === null ? match : String(v);
    });
  }

  function useTranslations(namespace?: string) {
    const root = namespace
      ? (resolveNode(messages, namespace.split(".")) as
          | CatalogValue
          | undefined)
      : (messages as unknown as CatalogValue);
    function t(key: string, values?: Record<string, unknown>) {
      const raw = resolve(root, key);
      return applyValues(raw, values);
    }
    return t;
  }

  function resolveNode(node: unknown, segments: string[]): unknown {
    let current: unknown = node;
    for (const segment of segments) {
      if (
        current &&
        typeof current === "object" &&
        segment in (current as Record<string, unknown>)
      ) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }
    return current;
  }

  return {
    useTranslations,
    useLocale: () => "en-US",
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});
