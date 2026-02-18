import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CompleteProfileForm } from "./CompleteProfileForm";

const mockUpdateSelfProfile = vi.fn();
const mockDeterminePostLoginDestination = vi.fn();

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => ({
    user: { id: "u-1", email: "test@example.com", displayName: null },
    workspaces: [{ slug: "main" }],
  }),
}));

vi.mock("@/lib/profile/profile-api", () => ({
  updateSelfProfile: (...args: unknown[]) => mockUpdateSelfProfile(...args),
}));

vi.mock("@/lib/redirect", () => ({
  getAllowedRedirectDomains: () => ["xynes.com", "localhost:3000"],
}));

vi.mock("@/lib/auth/post-login-destination", () => ({
  determinePostLoginDestination: (...args: unknown[]) =>
    mockDeterminePostLoginDestination(...args),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
  }),
}));

describe("CompleteProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateSelfProfile.mockResolvedValue({
      id: "u-1",
      email: "test@example.com",
      displayName: "Alice Doe",
      avatarUrl: null,
    });
    mockDeterminePostLoginDestination.mockReturnValue("/dashboard/apps");
  });

  it("updates displayName and redirects on success", async () => {
    const assignSpy = vi
      .spyOn(window.location, "assign")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();

    render(<CompleteProfileForm redirectUrl="/dashboard/apps" />);

    await user.type(screen.getByLabelText(/full name/i), "  Alice Doe  ");
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(mockUpdateSelfProfile).toHaveBeenCalledWith("Alice Doe");
      expect(assignSpy).toHaveBeenCalledWith("/dashboard/apps");
    });

    assignSpy.mockRestore();
  });
});
