import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";

// Use the real next-intl provider so pseudo-locale strings render through
// the real catalog selection path (mirrors LoginForm.i18n.test.tsx).
import { vi } from "vitest";
vi.unmock("next-intl");

import { NextIntlClientProvider } from "next-intl";
import { AuthErrorAlert } from "./AuthErrorAlert";
import type { AuthError } from "@/lib/errors";

import enUsErrors from "../../../messages/en-US/auth.errors.json";
import enXaErrors from "../../../messages/en-XA/auth.errors.json";

function withIntl(locale: "en-US" | "en-XA", children: ReactNode) {
  const messages =
    locale === "en-US"
      ? { auth: { errors: enUsErrors } }
      : { auth: { errors: enXaErrors } };
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

describe("AuthErrorAlert i18n", () => {
  afterEach(() => cleanup());

  it("renders the en-US catalog body for invalid_credentials", () => {
    const error: AuthError = {
      code: "invalid_credentials",
      message: "Invalid login credentials", // SDK upstream — must NOT leak
    };
    render(
      withIntl("en-US", <AuthErrorAlert error={error} title="Login failed" />),
    );

    expect(screen.getByText("Login failed")).toBeInTheDocument();
    expect(
      screen.getByText("Invalid email or password. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Invalid login credentials")).toBeNull();
  });

  it("renders the en-XA pseudo-locale body for invalid_credentials", () => {
    const error: AuthError = {
      code: "invalid_credentials",
      message: "Invalid login credentials",
    };
    render(
      withIntl(
        "en-XA",
        <AuthErrorAlert error={error} title="[LLooggiinn ffaaiilleedd]" />,
      ),
    );

    // Title was passed in by the caller (already pseudo-localized for the test).
    expect(screen.getByText("[LLooggiinn ffaaiilleedd]")).toBeInTheDocument();
    // Body resolves through next-intl from the en-XA catalog — proves the
    // SDK's en-US prose is NOT what reaches the DOM in pseudo-locale.
    expect(
      screen.getByText(
        "[IInnvvaalliidd eemmaaiill oorr ppaasssswwoorrdd. PPlleeaassee ttrryy aaggaaiinn.]",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Invalid login credentials")).toBeNull();
  });

  it("renders the en-XA body for network_error", () => {
    const error: AuthError = {
      code: "network_error",
      message: "Failed to fetch",
    };
    render(withIntl("en-XA", <AuthErrorAlert error={error} />));

    expect(
      screen.getByText(
        "[UUnnaabbllee ttoo ccoonnnneecctt. PPlleeaassee cchheecckk yyoouurr iinntteerrnneett ccoonnnneeccttiioonn.]",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Failed to fetch")).toBeNull();
  });

  it("renders the en-XA default title when no title is supplied", () => {
    const error: AuthError = { code: "unknown_error", message: "boom" };
    render(withIntl("en-XA", <AuthErrorAlert error={error} />));
    expect(
      screen.getByText("[AAnn eerrrroorr ooccccuurrrreedd]"),
    ).toBeInTheDocument();
  });
});
