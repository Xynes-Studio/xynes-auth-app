import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppsDashboardContent } from "./AppsDashboardContent";

vi.mock("@xynes/auth-sdk", async () => {
  const actual = await vi.importActual<typeof import("@xynes/auth-sdk")>(
    "@xynes/auth-sdk",
  );

  return {
    ...actual,
    useWorkspace: () => ({
      currentWorkspace: {
        id: "ws-1",
        name: "Xynes",
        slug: "acme-team",
      },
    }),
  };
});

describe("AppsDashboardContent", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("disables select-all and sort when one result is present", () => {
    render(<AppsDashboardContent />);

    expect(screen.getByLabelText("Select all apps")).toBeDisabled();
    expect(screen.getByLabelText("Sort apps")).toBeDisabled();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows marketplace under-development state with disabled search controls", async () => {
    const user = userEvent.setup();
    render(<AppsDashboardContent />);

    await user.click(screen.getByRole("tab", { name: "Marketplace" }));

    expect(
      screen.getByText("Marketplace is under development"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Search for apps")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("applies debounced search filtering", async () => {
    vi.useFakeTimers();
    render(<AppsDashboardContent />);

    fireEvent.change(screen.getByLabelText("Search for apps"), {
      target: { value: "unknown" },
    });

    expect(screen.queryByText(/No apps found/i)).not.toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText(/No apps found/i)).toBeInTheDocument();
  });

  it("applies immediate search when Search button is clicked", async () => {
    const user = userEvent.setup();
    render(<AppsDashboardContent />);

    await user.type(screen.getByLabelText("Search for apps"), "unknown");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText(/No apps found/i)).toBeInTheDocument();
  });

  it("launches CMS in new tab using workspace-scoped URL", async () => {
    const user = userEvent.setup();
    render(<AppsDashboardContent />);

    await user.click(screen.getByText("Xynes CMS"));

    expect(window.open).toHaveBeenCalledWith(
      "http://localhost:3000/acme-team",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
