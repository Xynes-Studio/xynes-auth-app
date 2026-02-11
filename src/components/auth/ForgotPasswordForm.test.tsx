import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ForgotPasswordForm } from "./ForgotPasswordForm";

const mockResetPasswordForEmail = vi.fn();
const mockCreatePasswordResetClient = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
    },
  }),
  createPasswordResetClient: () => {
    mockCreatePasswordResetClient();
    return {
      auth: {
        resetPasswordForEmail: mockResetPasswordForEmail,
      },
    };
  },
}));

describe("ForgotPasswordForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
  });

  it("should render email input and submit button", () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i }),
    ).toBeInTheDocument();
  });

  it("should request a password reset and show a generic success message", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockCreatePasswordResetClient).toHaveBeenCalled();
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
        "user@example.com",
        expect.objectContaining({
          redirectTo: expect.stringMatching(/\/reset-password$/),
        }),
      );
    });

    expect(
      screen.getByText(/if an account exists for that email/i),
    ).toBeInTheDocument();
  });

  it("should not leak account existence for non-existing emails", async () => {
    const user = userEvent.setup();
    mockResetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { message: "User not found", status: 400 },
    });

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), "nope@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalled();
    });

    expect(
      screen.getByText(/if an account exists for that email/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/user not found/i)).not.toBeInTheDocument();
  });

  it("should show a non-sensitive error message for unexpected failures", async () => {
    const user = userEvent.setup();
    mockResetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: { message: "Network error", status: 500 },
    });

    render(<ForgotPasswordForm />);

    await user.type(screen.getByLabelText(/email/i), "user@example.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/we couldn't send a reset email/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
  });
});
