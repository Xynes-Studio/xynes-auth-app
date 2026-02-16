import { describe, expect, it } from "vitest";
import {
  WORKSPACE_STORAGE_KEY,
  selectWorkspaceIdForPersistence,
} from "./workspace-default";

describe("selectWorkspaceIdForPersistence", () => {
  it("returns stored workspace id when it exists in available workspaces", () => {
    expect(
      selectWorkspaceIdForPersistence({
        workspaces: [{ id: "ws-1" }, { id: "ws-2" }],
        storedWorkspaceId: "ws-2",
      }),
    ).toBe("ws-2");
  });

  it("returns first available workspace id when stored id is missing", () => {
    expect(
      selectWorkspaceIdForPersistence({
        workspaces: [{ id: "ws-first" }, { id: "ws-second" }],
        storedWorkspaceId: null,
      }),
    ).toBe("ws-first");
  });

  it("returns first available workspace id when stored id is invalid", () => {
    expect(
      selectWorkspaceIdForPersistence({
        workspaces: [{ id: "ws-first" }, { id: "ws-second" }],
        storedWorkspaceId: "ws-missing",
      }),
    ).toBe("ws-first");
  });

  it("returns null when no valid workspace ids are available", () => {
    expect(
      selectWorkspaceIdForPersistence({
        workspaces: [{ slug: "invalid" }, { id: "" }, null],
        storedWorkspaceId: "ws-1",
      }),
    ).toBeNull();
  });

  it("exports the workspace storage key constant", () => {
    expect(WORKSPACE_STORAGE_KEY).toBe("xynes_workspace_id");
  });
});
