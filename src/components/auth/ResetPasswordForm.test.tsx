import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ResetPasswordForm } from "./ResetPasswordForm";

const mockUpdateUser = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createPasswordResetClient: () => ({
    auth: {
      updateUser: mockUpdateUser,
    },
  }),
}));

describe("ResetPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
  });

  it("should render password fields and submit button", () => {
    render(<ResetPasswordForm />);

    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /update password/i }),
    ).toBeInTheDocument();
  });

  it("should update the password and show success state", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "ValidPass123",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "ValidPass123" });
    });

    expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to login/i }),
    ).toHaveAttribute("href", "/login");
  });

  it("should show an error message when the update fails", async () => {
    const user = userEvent.setup();
    mockUpdateUser.mockResolvedValueOnce({
      data: {},
      error: { message: "Update failed" },
    });

    render(<ResetPasswordForm />);

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "ValidPass123",
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/couldn't update your password/i),
    ).toBeInTheDocument();
  });
});
