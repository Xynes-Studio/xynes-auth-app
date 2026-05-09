import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Workspace } from "@xynes/auth-sdk";

vi.unmock("next-intl");

import { NextIntlClientProvider } from "next-intl";
import { WorkspaceSelector } from "@/components/workspace/WorkspaceSelector";

import enUsWorkspaces from "../../../messages/en-US/auth.workspaces.json";
import enXaWorkspaces from "../../../messages/en-XA/auth.workspaces.json";

function withIntl(locale: "en-US" | "en-XA", children: ReactNode) {
  const messages =
    locale === "en-US"
      ? { auth: { workspaces: enUsWorkspaces } }
      : { auth: { workspaces: enXaWorkspaces } };
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
}

const noop = () => undefined;

describe("WorkspaceSelector i18n", () => {
  afterEach(() => cleanup());

  it("renders the empty-state in en-US", () => {
    render(
      withIntl(
        "en-US",
        <WorkspaceSelector
          workspaces={[]}
          onSelect={noop}
          onCreateNew={noop}
        />,
      ),
    );
    expect(screen.getByText(/no workspaces found/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create new workspace/i }),
    ).toBeInTheDocument();
  });

  it("renders the empty-state in pseudo-locale", () => {
    render(
      withIntl(
        "en-XA",
        <WorkspaceSelector
          workspaces={[]}
          onSelect={noop}
          onCreateNew={noop}
        />,
      ),
    );
    // Pseudo-locale wraps and doubles characters: "No workspaces found"
    // becomes "[NNoo wwoorrkkssppaacceess ffoouunndd]".
    expect(
      screen.getByText(/\[NNoo wwoorrkkssppaacceess ffoouunndd\]/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /\[CCrreeaattee NNeeww WWoorrkkssppaaccee\]/,
      }),
    ).toBeInTheDocument();
  });

  it("renders the owner badge translation when role is workspace_owner", () => {
    const workspace: Workspace = {
      id: "ws-1",
      name: "Acme",
      slug: "acme",
      role: "workspace_owner",
    } as Workspace;

    render(
      withIntl(
        "en-US",
        <WorkspaceSelector
          workspaces={[workspace]}
          onSelect={noop}
          onCreateNew={noop}
        />,
      ),
    );
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("never leaks raw catalog key paths to the DOM", () => {
    const workspace: Workspace = {
      id: "ws-1",
      name: "Acme",
      slug: "acme",
      role: "workspace_owner",
    } as Workspace;

    render(
      withIntl(
        "en-US",
        <WorkspaceSelector
          workspaces={[workspace]}
          onSelect={noop}
          onCreateNew={noop}
        />,
      ),
    );
    expect(screen.queryByText(/auth\.workspaces\./)).toBeNull();
    expect(screen.queryByText(/^selector\./)).toBeNull();
  });
});
