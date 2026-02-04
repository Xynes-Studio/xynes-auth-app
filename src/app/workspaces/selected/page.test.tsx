import { describe, it, expect, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

import { redirect } from "next/navigation";
import WorkspaceSelectedPage from "./page";

describe("WorkspaceSelectedPage", () => {
  it("redirects to the dashboard users page", () => {
    WorkspaceSelectedPage();

    expect(vi.mocked(redirect)).toHaveBeenCalledWith("/dashboard/users");
  });
});
