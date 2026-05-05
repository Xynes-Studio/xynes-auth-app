import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InviteEntryForm } from "./InviteEntryForm";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("InviteEntryForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the invite entry form", () => {
    render(<InviteEntryForm />);

    expect(screen.getByLabelText(/invite link or code/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeInTheDocument();
  });

  it("navigates to the invite preview for a raw token", async () => {
    render(<InviteEntryForm />);

    const input = screen.getByLabelText(/invite link or code/i);
    const token = "a".repeat(32);
    await user.type(input, token);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(mockPush).toHaveBeenCalledWith(`/invite/${token}`);
  });

  it("navigates to the invite preview for a full invite URL", async () => {
    render(<InviteEntryForm />);

    const input = screen.getByLabelText(/invite link or code/i);
    const token = "b".repeat(32);
    await user.type(input, `http://localhost:3100/invite/${token}`);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(mockPush).toHaveBeenCalledWith(`/invite/${token}`);
  });

  it("shows an error message for empty input", async () => {
    render(<InviteEntryForm />);

    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /enter your invite link or code/i,
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows an error message for invalid tokens", async () => {
    render(<InviteEntryForm />);

    const input = screen.getByLabelText(/invite link or code/i);
    await user.type(input, "abc 123");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /invite code looks incorrect/i,
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows an error message for tokens that are too short", async () => {
    render(<InviteEntryForm />);

    const input = screen.getByLabelText(/invite link or code/i);
    await user.type(input, "short");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /invite code must be between/i,
    );
    expect(mockPush).not.toHaveBeenCalled();
  });
});
