import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { ProfileCompletionGate } from "./ProfileCompletionGate";

const mockReplace = vi.fn();
const mockAuthState = {
  isLoading: false,
  isAuthenticated: true,
  user: { displayName: null as string | null },
};

let mockPathname = "/dashboard/apps";
let mockQuery = "tab=overview";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockQuery),
}));

vi.mock("@xynes/auth-sdk", () => ({
  useAuth: () => mockAuthState,
}));

describe("ProfileCompletionGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/dashboard/apps";
    mockQuery = "tab=overview";
    mockAuthState.isLoading = false;
    mockAuthState.isAuthenticated = true;
    mockAuthState.user = { displayName: null };
  });

  it("redirects authenticated users with missing displayName to complete-profile", async () => {
    render(
      <ProfileCompletionGate>
        <div>content</div>
      </ProfileCompletionGate>,
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith(
        "/complete-profile?redirect=%2Fdashboard%2Fapps%3Ftab%3Doverview",
      );
    });
  });

  it("does not redirect on exempt auth routes", async () => {
    mockPathname = "/complete-profile";

    render(
      <ProfileCompletionGate>
        <div>content</div>
      </ProfileCompletionGate>,
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});
