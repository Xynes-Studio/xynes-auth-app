import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiKeyScopeDetails } from "./ApiKeyScopeDetails";

describe("persisted scope disclosure", () => {
  it("loads actual actions on demand and never infers delivery rights", async () => {
    const read = vi.fn().mockResolvedValue(["cms.entry.create", "cms.entry.publish"]);
    render(<ApiKeyScopeDetails keyId="fixture-key" name="Old publisher" onReadScopes={read} />);
    expect(read).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Show scopes for API key Old publisher" }));
    await screen.findByText("cms.entry.publish");
    expect(screen.queryByText("cms.delivery.getById")).not.toBeInTheDocument();
    expect(read).toHaveBeenCalledWith("fixture-key", expect.any(AbortSignal));
  });
  it("shows a safe failure and supports retry with an empty actual set", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("private failure details")).mockResolvedValueOnce([]);
    render(<ApiKeyScopeDetails keyId="fixture-key" name="Fixture" onReadScopes={read} />);
    await userEvent.click(screen.getByRole("button", { name: "Show scopes for API key Fixture" }));
    await screen.findByText("Couldn’t load allowed actions. Try again.");
    expect(screen.queryByText("private failure details")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show scopes for API key Fixture" }));
    await screen.findByText("This key has no allowed actions.");
  });
  it("aborts a pending read when the key or workspace panel is removed", async () => {
    let signal: AbortSignal | undefined;
    const read = vi.fn((_key: string, value: AbortSignal) => {
      signal = value;
      return new Promise<readonly string[]>(() => {});
    });
    const view = render(<ApiKeyScopeDetails keyId="fixture-key" name="Fixture" onReadScopes={read} />);
    await userEvent.click(screen.getByRole("button", { name: "Show scopes for API key Fixture" }));
    await waitFor(() => expect(read).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", { name: "Show scopes for API key Fixture" })).toBeDisabled();
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
