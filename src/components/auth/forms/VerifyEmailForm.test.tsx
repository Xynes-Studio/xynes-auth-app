import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VerifyEmailForm } from "./VerifyEmailForm";

const mockVerifyOtp = vi.fn();
const mockResend = vi.fn();
const mockRouterReplace = vi.fn();
const mockDeterminePostLoginDestination = vi.fn();
const mockFetchMeBootstrap = vi.fn();
const mockSearchParamGet = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      verifyOtp: (...args: unknown[]) => mockVerifyOtp(...args),
      resend: (...args: unknown[]) => mockResend(...args),
    },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockRouterReplace,
  }),
  useSearchParams: () => ({
    get: (...args: unknown[]) => mockSearchParamGet(...args),
  }),
}));

vi.mock("@/lib/redirect", () => ({
  getAllowedRedirectDomains: () => ["xynes.com", "localhost:3000"],
}));

vi.mock("@/lib/auth/post-login-destination", () => ({
  determinePostLoginDestination: (...args: unknown[]) =>
    mockDeterminePostLoginDestination(...args),
}));

vi.mock("@/lib/profile/profile-api", () => ({
  fetchMeBootstrap: (...args: unknown[]) => mockFetchMeBootstrap(...args),
}));

describe("VerifyEmailForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParamGet.mockReturnValue(null);
    mockVerifyOtp.mockResolvedValue({ error: null });
    mockResend.mockResolvedValue({ error: null });
    mockFetchMeBootstrap.mockResolvedValue({
      user: { id: "u-1", email: "a@b.com", displayName: "Alice", avatarUrl: null },
      workspaces: [],
    });
    mockDeterminePostLoginDestination.mockReturnValue("/onboarding");
  });

  it("verifies OTP code and redirects after success", async () => {
    const user = userEvent.setup();
    render(
      <VerifyEmailForm
        initialEmail="test@example.com"
        redirectUrl="/dashboard/apps"
      />,
    );

    await user.type(
      screen.getByLabelText(/verification code/i),
      "123456",
    );
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        email: "test@example.com",
        token: "123456",
        type: "signup",
      });
      expect(mockRouterReplace).toHaveBeenCalledWith("/onboarding");
      });
  });

  it("starts resend cooldown after resend succeeds", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailForm initialEmail="test@example.com" />);

    await user.click(screen.getByRole("button", { name: /resend code/i }));

    await waitFor(() => {
      expect(mockResend).toHaveBeenCalledWith({
        type: "signup",
        email: "test@example.com",
      });
      expect(screen.getByText(/resend code in 30s/i)).toBeInTheDocument();
    });
  });

  it("shows error when verify code API returns invalid code", async () => {
    mockVerifyOtp.mockResolvedValue({
      error: { message: "Invalid code" },
    });

    const user = userEvent.setup();
    render(<VerifyEmailForm initialEmail="test@example.com" />);

    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    expect(
      await screen.findByText(/the code is invalid or expired/i),
    ).toBeInTheDocument();
    expect(mockRouterReplace).not.toHaveBeenCalled();
  });

  it("shows error when verify code API throws", async () => {
    mockVerifyOtp.mockRejectedValueOnce(new Error("Network down"));

    const user = userEvent.setup();
    render(<VerifyEmailForm initialEmail="test@example.com" />);

    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    expect(
      await screen.findByText(/unable to verify the code right now/i),
    ).toBeInTheDocument();
  });

  it("requires email before resending code", async () => {
    const user = userEvent.setup();
    render(<VerifyEmailForm />);

    await user.click(screen.getByRole("button", { name: /resend code/i }));

    expect(
      await screen.findByText(/enter your email first to resend the code/i),
    ).toBeInTheDocument();
    expect(mockResend).not.toHaveBeenCalled();
  });

  it("shows generic error when resend fails", async () => {
    mockResend.mockResolvedValueOnce({
      error: { message: "rate limited" },
    });

    const user = userEvent.setup();
    render(<VerifyEmailForm initialEmail="test@example.com" />);

    await user.click(screen.getByRole("button", { name: /resend code/i }));

    expect(
      await screen.findByText(/couldn't resend the code right now/i),
    ).toBeInTheDocument();
  });

  it("handles token_hash verification flow", async () => {
    mockSearchParamGet.mockImplementation((key: string) => {
      if (key === "token_hash") return "token-hash-123";
      if (key === "type") return "email";
      return null;
    });

    render(<VerifyEmailForm redirectUrl="/dashboard/apps" />);

    await waitFor(() => {
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        token_hash: "token-hash-123",
        type: "email",
      });
    });
  });

  it("shows invalid link error for token_hash failure", async () => {
    mockSearchParamGet.mockImplementation((key: string) => {
      if (key === "token_hash") return "token-hash-123";
      return null;
    });
    mockVerifyOtp.mockResolvedValue({
      error: { message: "expired" },
    });

    render(<VerifyEmailForm />);

    expect(
      await screen.findByText(/verification link is invalid or expired/i),
    ).toBeInTheDocument();
  });

  it("shows network error when token_hash verification throws", async () => {
    mockSearchParamGet.mockImplementation((key: string) => {
      if (key === "token_hash") return "token-hash-123";
      return null;
    });
    mockVerifyOtp.mockRejectedValue(new Error("network"));

    render(<VerifyEmailForm />);

    expect(
      await screen.findByText(/network error verifying link/i),
    ).toBeInTheDocument();
  });

  it("falls back to provided redirect when /me bootstrap fails", async () => {
    mockFetchMeBootstrap.mockRejectedValueOnce(new Error("bootstrap failed"));

    const user = userEvent.setup();
    render(
      <VerifyEmailForm
        initialEmail="test@example.com"
        redirectUrl="/workspace/apps"
      />,
    );

    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify email/i }));

    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith("/workspace/apps");
    });
  });
});
