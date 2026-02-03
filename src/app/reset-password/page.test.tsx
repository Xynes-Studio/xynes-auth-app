import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockExchangeCodeForSession = vi.fn();
const mockUpdateUser = vi.fn();
const mockVerifyOtp = vi.fn();
const mockSetSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createPasswordResetClient: () => ({
    auth: {
      exchangeCodeForSession: mockExchangeCodeForSession,
      updateUser: mockUpdateUser,
      verifyOtp: mockVerifyOtp,
      setSession: mockSetSession,
    },
  }),
}));

let mockSearchParams: Record<string, string | null> = { code: "test-code" };
vi.mock("next/navigation", () => ({
  useSearchParams: () => ({
    get: (key: string) => {
      return mockSearchParams[key] ?? null;
      return null;
    },
  }),
}));

import ResetPasswordPage from "./page";

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mockExchangeCodeForSession.mockReset();
    mockUpdateUser.mockReset();
    mockVerifyOtp.mockReset();
    mockSetSession.mockReset();
    mockSearchParams = { code: "test-code" };
    mockExchangeCodeForSession.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: {}, error: null });
    mockVerifyOtp.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });
    mockSetSession.mockResolvedValue({
      data: { session: { access_token: "token" } },
      error: null,
    });
    window.location.hash = "";
  });

  it("should show an invalid link message when no code is provided", async () => {
    mockSearchParams = { code: null };
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
    });

    expect(
      screen.getByRole("link", { name: /request a new reset link/i })
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("should show an invalid link message when exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: {},
      error: { message: "Invalid code" },
    });
    mockVerifyOtp.mockResolvedValueOnce({
      data: {},
      error: { message: "Also invalid" },
    });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
    });
  });

  it("should fall back to verifyOtp when code exchange fails", async () => {
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: {},
      error: { message: "PKCE exchange failed" },
    });
    mockVerifyOtp.mockResolvedValueOnce({
      data: { session: { access_token: "token" } },
      error: null,
    });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: "test-code",
        type: "recovery",
      });
    });

    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
  });

  it("should exchange code and allow updating the password", async () => {
    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("test-code");
    });

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "ValidPass123"
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "ValidPass123" });
    });

    expect(screen.getByText(/password updated/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("should support token_hash recovery links", async () => {
    mockSearchParams = { code: null, token_hash: "token-hash", type: "recovery" };

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: "token-hash",
        type: "recovery",
      });
    });

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "ValidPass123"
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "ValidPass123" });
    });
  });

  it("should support legacy token + email recovery links", async () => {
    mockSearchParams = {
      code: null,
      email: "archan.ray2011@gmail.com",
      token: "otp-token",
      type: "recovery",
    };

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: "archan.ray2011@gmail.com",
        token: "otp-token",
        type: "recovery",
      });
    });

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "ValidPass123"
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "ValidPass123" });
    });
  });

  it("should support hash-based recovery links (access_token + refresh_token)", async () => {
    mockSearchParams = { code: null };
    window.location.hash =
      "#access_token=access&refresh_token=refresh&type=recovery";

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "access",
        refresh_token: "refresh",
      });
    });

    await user.type(screen.getByLabelText(/^new password$/i), "ValidPass123");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "ValidPass123"
    );
    await user.click(screen.getByRole("button", { name: /update password/i }));

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: "ValidPass123" });
    });
  });

  it("should show debug details when debug=1", async () => {
    mockSearchParams = { code: "test-code", debug: "1" };
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: {},
      error: { message: "Invalid code" },
    });
    mockVerifyOtp.mockResolvedValueOnce({
      data: {},
      error: { message: "Also invalid" },
    });

    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByText(/invalid or expired link/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/reset-password debug/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/exchangeCodeForSession/i)).toBeInTheDocument();
  });

  it("should prompt for email when only a short OTP code is present", async () => {
    mockSearchParams = { code: "123456" };
    mockExchangeCodeForSession.mockResolvedValueOnce({
      data: {},
      error: {
        message: "PKCE code verifier not found in storage.",
        code: "pkce_code_verifier_not_found",
      },
    });
    mockVerifyOtp.mockResolvedValueOnce({
      data: {},
      error: { message: "Email link is invalid or has expired", code: "otp_expired" },
    });

    const user = userEvent.setup();
    render(<ResetPasswordPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/enter the email for this reset link/i)
      ).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/email/i), "test@example.com");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        token: "123456",
        type: "recovery",
      });
    });
  });
});
