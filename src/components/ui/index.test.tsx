import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OAuthButtons, OAUTH_PROVIDERS, AuthDivider, AuthErrorAlert } from "./index";
import type { AuthError } from "@/lib/errors";

// Mock Supabase client
const mockSignInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOAuth: mockSignInWithOAuth,
    },
  })),
}));

// Mock window.location
const mockLocation = {
  origin: "http://localhost:3000",
  href: "http://localhost:3000",
};

describe("OAuthButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      value: mockLocation,
      writable: true,
    });
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("renders Google and GitHub buttons", () => {
      render(<OAuthButtons />);
      
      expect(screen.getByRole("button", { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /github/i })).toBeInTheDocument();
    });

    it("renders buttons as disabled when disabled prop is true", () => {
      render(<OAuthButtons disabled />);
      
      expect(screen.getByRole("button", { name: /google/i })).toBeDisabled();
      expect(screen.getByRole("button", { name: /github/i })).toBeDisabled();
    });
  });

  describe("OAuth flow", () => {
    it("calls signInWithOAuth with google provider when Google button clicked", async () => {
      render(<OAuthButtons />);
      
      fireEvent.click(screen.getByRole("button", { name: /google/i }));
      
      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: {
            redirectTo: "http://localhost:3000/callback",
          },
        });
      });
    });

    it("calls signInWithOAuth with github provider when GitHub button clicked", async () => {
      render(<OAuthButtons />);
      
      fireEvent.click(screen.getByRole("button", { name: /github/i }));
      
      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "github",
          options: {
            redirectTo: "http://localhost:3000/callback",
          },
        });
      });
    });

    it("includes redirect URL in OAuth options when provided", async () => {
      render(<OAuthButtons redirectUrl="/dashboard" />);
      
      fireEvent.click(screen.getByRole("button", { name: /google/i }));
      
      await waitFor(() => {
        expect(mockSignInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: {
            redirectTo: "http://localhost:3000/callback?redirect=%2Fdashboard",
          },
        });
      });
    });

    it("calls onError callback when OAuth fails", async () => {
      const mockError = { message: "OAuth failed" };
      mockSignInWithOAuth.mockResolvedValue({ data: {}, error: mockError });
      const onError = vi.fn();
      
      render(<OAuthButtons onError={onError} />);
      fireEvent.click(screen.getByRole("button", { name: /google/i }));
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it("calls onLoadingChange callback during OAuth flow", async () => {
      const onLoadingChange = vi.fn();
      
      render(<OAuthButtons onLoadingChange={onLoadingChange} />);
      fireEvent.click(screen.getByRole("button", { name: /google/i }));
      
      await waitFor(() => {
        expect(onLoadingChange).toHaveBeenCalledWith(true);
        expect(onLoadingChange).toHaveBeenCalledWith(false);
      });
    });
  });
});

describe("OAUTH_PROVIDERS", () => {
  it("exports list of providers with correct structure", () => {
    expect(OAUTH_PROVIDERS).toHaveLength(2);
    expect(OAUTH_PROVIDERS[0].id).toBe("google");
    expect(OAUTH_PROVIDERS[0].name).toBe("Google");
    expect(OAUTH_PROVIDERS[1].id).toBe("github");
    expect(OAUTH_PROVIDERS[1].name).toBe("GitHub");
  });
});

describe("AuthDivider", () => {
  it("renders with default text", () => {
    render(<AuthDivider />);
    expect(screen.getByText("Or continue with")).toBeInTheDocument();
  });

  it("renders with custom text", () => {
    render(<AuthDivider text="Custom text" />);
    expect(screen.getByText("Custom text")).toBeInTheDocument();
  });
});

describe("AuthErrorAlert", () => {
  it("renders nothing when error is null", () => {
    const { container } = render(<AuthErrorAlert error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders error message with default title", () => {
    const error: AuthError = { code: "unknown_error", message: "Test error message" };
    render(<AuthErrorAlert error={error} />);
    
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("An error occurred")).toBeInTheDocument();
    expect(screen.getByText("Test error message")).toBeInTheDocument();
  });

  it("renders error message with custom title", () => {
    const error: AuthError = { code: "unknown_error", message: "Test error message" };
    render(<AuthErrorAlert error={error} title="Login failed" />);
    
    expect(screen.getByText("Login failed")).toBeInTheDocument();
  });
});
