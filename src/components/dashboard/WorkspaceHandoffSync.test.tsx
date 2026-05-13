import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceHandoffSync } from "./WorkspaceHandoffSync";

// ---- Mocks ----------------------------------------------------------------

const { selectWorkspaceMock, routerReplaceMock } = vi.hoisted(() => ({
  selectWorkspaceMock: vi.fn(),
  routerReplaceMock: vi.fn(),
}));

const navState = vi.hoisted(() => ({
  pathname: "/dashboard/integrations" as string | null,
  searchString: "" as string,
}));

const authState = vi.hoisted(() => ({
  isLoading: false,
  workspaces: [] as Array<{ id: string; slug?: string | null }>,
}));

const workspaceState = vi.hoisted(() => ({
  isLoading: false,
  currentWorkspace: null as null | { id: string; slug?: string | null },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplaceMock }),
  usePathname: () => navState.pathname,
  useSearchParams: () => new URLSearchParams(navState.searchString),
}));

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => authState,
  useWorkspace: () => ({
    ...workspaceState,
    selectWorkspace: selectWorkspaceMock,
  }),
}));

// ---- Helpers --------------------------------------------------------------

function setRoute(pathname: string, searchString: string) {
  navState.pathname = pathname;
  navState.searchString = searchString;
}

let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

// ---- Tests ----------------------------------------------------------------

describe("WorkspaceHandoffSync (FE-XAPP-BUG-001)", () => {
  beforeEach(() => {
    selectWorkspaceMock.mockReset();
    routerReplaceMock.mockReset();
    authState.isLoading = false;
    authState.workspaces = [];
    workspaceState.isLoading = false;
    workspaceState.currentWorkspace = null;
    setRoute("/dashboard/integrations", "");
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it("selects the workspace whose slug matches ?workspace=<slug>", () => {
    authState.workspaces = [
      { id: "ws-A", slug: "safarnama" },
      { id: "ws-B", slug: "vintage-violet" },
    ];
    workspaceState.currentWorkspace = { id: "ws-B", slug: "vintage-violet" };
    setRoute("/dashboard/integrations", "tab=domains&workspace=safarnama");

    render(<WorkspaceHandoffSync />);

    expect(selectWorkspaceMock).toHaveBeenCalledWith("ws-A");
    expect(selectWorkspaceMock).toHaveBeenCalledTimes(1);
  });

  it("strips the ?workspace= param via router.replace, preserving other params", () => {
    authState.workspaces = [{ id: "ws-A", slug: "safarnama" }];
    workspaceState.currentWorkspace = null;
    setRoute(
      "/dashboard/integrations",
      "tab=api-keys&preset=cms_readonly&workspace=safarnama",
    );

    render(<WorkspaceHandoffSync />);

    expect(routerReplaceMock).toHaveBeenCalledTimes(1);
    const [calledUrl, opts] = routerReplaceMock.mock.calls[0];
    expect(calledUrl).toBe(
      "/dashboard/integrations?tab=api-keys&preset=cms_readonly",
    );
    expect(opts).toEqual({ scroll: false });
  });

  it("strips a lone ?workspace= so the resulting URL has no query string", () => {
    authState.workspaces = [{ id: "ws-A", slug: "safarnama" }];
    setRoute("/dashboard/integrations", "workspace=safarnama");

    render(<WorkspaceHandoffSync />);

    expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard/integrations", {
      scroll: false,
    });
  });

  it("does NOT re-select when the slug already matches the current workspace", () => {
    authState.workspaces = [{ id: "ws-A", slug: "safarnama" }];
    workspaceState.currentWorkspace = { id: "ws-A", slug: "safarnama" };
    setRoute("/dashboard/integrations", "workspace=safarnama");

    render(<WorkspaceHandoffSync />);

    expect(selectWorkspaceMock).not.toHaveBeenCalled();
    // But we still strip the param so future renders don't reprocess.
    expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard/integrations", {
      scroll: false,
    });
  });

  it("fails closed for an unknown slug — does not call selectWorkspace, emits a console.warn, strips the param", () => {
    authState.workspaces = [{ id: "ws-A", slug: "safarnama" }];
    workspaceState.currentWorkspace = { id: "ws-A", slug: "safarnama" };
    setRoute("/dashboard/integrations", "workspace=evil-other-workspace");

    render(<WorkspaceHandoffSync />);

    expect(selectWorkspaceMock).not.toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy.mock.calls[0][0]).toMatch(
      /Ignoring \?workspace=evil-other-workspace/,
    );
    expect(routerReplaceMock).toHaveBeenCalledWith("/dashboard/integrations", {
      scroll: false,
    });
  });

  it("does nothing when there is no ?workspace= param at all", () => {
    authState.workspaces = [{ id: "ws-A", slug: "safarnama" }];
    setRoute("/dashboard/apps", "");

    render(<WorkspaceHandoffSync />);

    expect(selectWorkspaceMock).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  it("does nothing when ?workspace= is whitespace-only", () => {
    authState.workspaces = [{ id: "ws-A", slug: "safarnama" }];
    setRoute("/dashboard/integrations", "workspace=%20%20%20");

    render(<WorkspaceHandoffSync />);

    expect(selectWorkspaceMock).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("waits for auth state to be ready before classifying a slug as unknown", () => {
    authState.isLoading = true;
    authState.workspaces = []; // not yet loaded
    setRoute("/dashboard/integrations", "workspace=safarnama");

    render(<WorkspaceHandoffSync />);

    expect(selectWorkspaceMock).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("waits for workspace provider to be ready before acting", () => {
    workspaceState.isLoading = true;
    authState.workspaces = [{ id: "ws-A", slug: "safarnama" }];
    setRoute("/dashboard/integrations", "workspace=safarnama");

    render(<WorkspaceHandoffSync />);

    expect(selectWorkspaceMock).not.toHaveBeenCalled();
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it("matches slugs case-insensitively", () => {
    authState.workspaces = [{ id: "ws-A", slug: "Safarnama" }];
    workspaceState.currentWorkspace = null;
    setRoute("/dashboard/integrations", "workspace=SAFARNAMA");

    render(<WorkspaceHandoffSync />);

    expect(selectWorkspaceMock).toHaveBeenCalledWith("ws-A");
  });

  it("does not leak a raw slug into selectWorkspace (only resolved id is dispatched)", () => {
    // Defense-in-depth: slug is NOT a permission grant. We only ever
    // dispatch a known workspace id resolved against useAuth().workspaces.
    authState.workspaces = [{ id: "ws-A", slug: "safarnama" }];
    setRoute(
      "/dashboard/integrations",
      "workspace=safarnama%3B%20DROP%20TABLE%20workspaces",
    );

    render(<WorkspaceHandoffSync />);

    // Hostile slug doesn't match — should never call selectWorkspace.
    expect(selectWorkspaceMock).not.toHaveBeenCalled();
  });

  it("renders nothing (returns null)", () => {
    authState.workspaces = [];
    const { container } = render(<WorkspaceHandoffSync />);
    expect(container.firstChild).toBeNull();
  });
});
