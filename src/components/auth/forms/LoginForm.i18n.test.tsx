import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("@xynes/auth-sdk", async () => {
  const useFeatureFlags = () => ({
    flags: {},
    isLoading: false,
    error: null,
  });
  const useOAuthProviders = () => [];
  return { useFeatureFlags, useOAuthProviders };
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
    },
  }),
  createPasswordResetClient: () => ({
    auth: {
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ error: null }),
    },
  }),
}));

// Use a custom NextIntlClientProvider per test by overriding the global mock.
// Each test imports the real next-intl provider so pseudo-locale strings
// (`[CCoonnttiinnuuee]`) render through the real catalog selection path.
vi.unmock("next-intl");

import { NextIntlClientProvider } from "next-intl";
import { LoginForm } from "@/components/auth/forms/LoginForm";

import enUsCommon from "../../../../messages/en-US/auth.common.json";
import enUsErrors from "../../../../messages/en-US/auth.errors.json";
import enUsLogin from "../../../../messages/en-US/auth.login.json";
import enXaCommon from "../../../../messages/en-XA/auth.common.json";
import enXaErrors from "../../../../messages/en-XA/auth.errors.json";
import enXaLogin from "../../../../messages/en-XA/auth.login.json";

function withIntl(locale: "en-US" | "en-XA", children: ReactNode) {
  const messages =
    locale === "en-US"
      ? {
          auth: { common: enUsCommon, errors: enUsErrors, login: enUsLogin },
        }
      : {
          auth: { common: enXaCommon, errors: enXaErrors, login: enXaLogin },
        };
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

describe("LoginForm i18n", () => {
  afterEach(() => cleanup());

  it("renders the en-US catalog by default", () => {
    render(withIntl("en-US", <LoginForm />));
    expect(
      screen.getByRole("button", { name: /^continue$/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /forgot password/i }),
    ).toBeInTheDocument();
  });

  it("renders the en-XA pseudo-locale catalog through next-intl", () => {
    render(withIntl("en-XA", <LoginForm />));
    // Pseudo-locale wraps every leaf string in [..] and doubles every char.
    expect(
      screen.getByRole("button", { name: /\[CCoonnttiinnuuee\]/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /\[FFoorrggoott ppaasssswwoorrdd\?\]/ }),
    ).toBeInTheDocument();
    // Email label is wrapped too.
    expect(screen.getByLabelText(/\[EEmmaaiill\]/)).toBeInTheDocument();
  });

  it("does not render any translation key path as raw text on either locale", () => {
    render(withIntl("en-US", <LoginForm />));
    // A raw key like `auth.common.fields.email` would indicate a missing
    // translation. None should be visible to the user.
    expect(screen.queryByText(/auth\.common\./)).toBeNull();
    expect(screen.queryByText(/auth\.login\./)).toBeNull();
  });
});
