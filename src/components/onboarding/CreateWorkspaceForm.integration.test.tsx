/**
 * CreateWorkspaceForm Component Tests
 *
 * Integration tests for the workspace creation form.
 * Following Tier 2 testing standards with 70%+ coverage target.
 *
 * @module onboarding/CreateWorkspaceForm.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateWorkspaceForm } from "./CreateWorkspaceForm";

// Mock the supabase client
const mockGetSession = vi.fn();
const mockSupabase = {
  auth: {
    getSession: mockGetSession,
  },
};

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => mockSupabase,
}));

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CreateWorkspaceForm", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: "test-token" },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("rendering", () => {
    it("should render the form with all required fields", () => {
      render(<CreateWorkspaceForm />);

      expect(
        screen.getByRole("heading", { name: /create your workspace/i }),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/workspace url/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create workspace/i }),
      ).toBeInTheDocument();
    });

    it('should render the "Join with an invite" link', () => {
      render(<CreateWorkspaceForm />);

      const inviteLink = screen.getByRole("link", {
        name: /join with an invite/i,
      });
      expect(inviteLink).toBeInTheDocument();
      expect(inviteLink).toHaveAttribute("href", "/invite");
    });

    it("should display slug format rules", () => {
      render(<CreateWorkspaceForm />);

      const rules = screen.getByText(/3-50 characters/i);
      expect(rules).toBeInTheDocument();
      expect(rules).toHaveClass("text-foreground/70");
    });
  });

  describe("auto-generation of slug", () => {
    it("should auto-generate slug from workspace name", async () => {
      render(<CreateWorkspaceForm />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.type(nameInput, "My Awesome Team");

      const slugInput = screen.getByLabelText(
        /workspace url/i,
      ) as HTMLInputElement;
      expect(slugInput.value).toBe("my-awesome-team");
    });

    it("should stop auto-generating when user manually edits slug", async () => {
      render(<CreateWorkspaceForm />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      const slugInput = screen.getByLabelText(/workspace url/i);

      // Type name first
      await user.type(nameInput, "My Team");
      expect(slugInput).toHaveValue("my-team");

      // Manually edit slug
      await user.clear(slugInput);
      await user.type(slugInput, "custom-slug");

      // Change name again
      await user.clear(nameInput);
      await user.type(nameInput, "Another Name");

      // Slug should remain as manually entered
      expect(slugInput).toHaveValue("custom-slug");
    });
  });

  describe("validation", () => {
    it("should show error for empty workspace name", async () => {
      render(<CreateWorkspaceForm />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.click(nameInput);
      await user.tab(); // blur

      await waitFor(() => {
        expect(
          screen.getByText(/workspace name is required/i),
        ).toBeInTheDocument();
      });
    });

    it("should show error for invalid slug format", async () => {
      render(<CreateWorkspaceForm />);

      const slugInput = screen.getByLabelText(/workspace url/i);
      await user.type(slugInput, "123-invalid");
      await user.tab(); // blur

      await waitFor(() => {
        // Use getByRole alert to specifically target the error message
        const errorElement = screen.getByRole("alert");
        expect(errorElement).toHaveTextContent(/must start with a letter/i);
      });
    });

    it("should show error for slug with consecutive hyphens", async () => {
      render(<CreateWorkspaceForm />);

      const slugInput = screen.getByLabelText(/workspace url/i);
      await user.type(slugInput, "my--team");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText(/cannot contain consecutive hyphens/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe("slug availability check", () => {
    it("should check slug availability (debounced)", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ available: true }),
      });

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const slugInput = screen.getByLabelText(/workspace url/i);
      await user.type(slugInput, "my-team");

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(
            "https://api.test.com/workspaces/check-slug/my-team",
            expect.objectContaining({
              method: "GET",
            }),
          );
        },
        { timeout: 1000 },
      );
    });

    it("should show available status when slug is available", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ available: true }),
      });

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const slugInput = screen.getByLabelText(/workspace url/i);
      await user.type(slugInput, "my-team");

      await waitFor(() => {
        expect(screen.getByText(/is available/i)).toBeInTheDocument();
      });
    });

    it("should show unavailable status when slug is taken", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ available: false }),
      });

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const slugInput = screen.getByLabelText(/workspace url/i);
      await user.type(slugInput, "taken-slug");

      await waitFor(() => {
        expect(screen.getByText(/already taken/i)).toBeInTheDocument();
      });
    });
  });

  describe("form submission", () => {
    it("should submit form with valid data", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ available: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "workspace-123",
              name: "My Team",
              slug: "my-team",
            }),
        });

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });

      await user.type(nameInput, "My Team");

      // Wait for slug availability check
      await waitFor(() => {
        expect(screen.getByText(/is available/i)).toBeInTheDocument();
      });

      await user.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          "https://api.test.com/workspaces",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "My Team", slug: "my-team" }),
          }),
        );
      });
    });

    it("should handle gateway envelope response and redirect using workspace slug", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ available: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              ok: true,
              data: {
                id: "workspace-123",
                name: "My Team",
                slug: "my-team",
              },
            }),
        });

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.type(nameInput, "My Team");

      await waitFor(() => {
        expect(screen.getByText(/is available/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/my-team");
      });
    });

    it("should redirect to workspace dashboard on success", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ available: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "workspace-123",
              name: "My Team",
              slug: "my-team",
            }),
        });

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.type(nameInput, "My Team");

      await waitFor(() => {
        expect(screen.getByText(/is available/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalled();
      });
    });

    it("should redirect to external console URL on success when NEXT_PUBLIC_CONSOLE_URL is set", async () => {
      const previousConsoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL;
      process.env.NEXT_PUBLIC_CONSOLE_URL = "https://console.test.com";
      const assignSpy = vi
        .spyOn(window.location, "assign")
        .mockImplementation(() => {});

      try {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ available: true }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "workspace-123",
                name: "My Team",
                slug: "my-team",
              }),
          });

        render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

        const nameInput = screen.getByLabelText(/workspace name/i);
        await user.type(nameInput, "My Team");

        await waitFor(() => {
          expect(screen.getByText(/is available/i)).toBeInTheDocument();
        });

        const submitButton = screen.getByRole("button", {
          name: /create workspace/i,
        });
        await user.click(submitButton);

        await waitFor(() => {
          expect(assignSpy).toHaveBeenCalledWith(
            "https://console.test.com/my-team",
          );
        });
        expect(mockPush).not.toHaveBeenCalled();
      } finally {
        process.env.NEXT_PUBLIC_CONSOLE_URL = previousConsoleUrl;
        assignSpy.mockRestore();
      }
    });

    it("should show error on 409 duplicate slug", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ available: true }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          json: () =>
            Promise.resolve({
              message: "Workspace with this slug already exists",
            }),
        });

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.type(nameInput, "My Team");

      await waitFor(() => {
        expect(screen.getByText(/is available/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });
    });

    it("should show loading state during submission", async () => {
      let resolveSubmit: (value: unknown) => void;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ available: true }),
        })
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveSubmit = resolve;
            }),
        );

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.type(nameInput, "My Team");

      await waitFor(() => {
        expect(screen.getByText(/is available/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /creating/i }),
        ).toBeInTheDocument();
      });

      // Resolve the promise
      await act(async () => {
        resolveSubmit!({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "workspace-123",
              name: "My Team",
              slug: "my-team",
            }),
        });
      });
    });

    it("should disable submit button when form is invalid", async () => {
      render(<CreateWorkspaceForm />);

      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });
      expect(submitButton).toBeDisabled();
    });

    it("should disable submit button when slug is unavailable", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ available: false }),
      });

      render(<CreateWorkspaceForm apiBaseUrl="https://api.test.com" />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.type(nameInput, "My Team");

      await waitFor(() => {
        expect(screen.getByText(/already taken/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });
      expect(submitButton).toBeDisabled();
    });
  });

  describe("accessibility", () => {
    it("should have proper form labels", () => {
      render(<CreateWorkspaceForm />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      const slugInput = screen.getByLabelText(/workspace url/i);

      expect(nameInput).toHaveAttribute("id");
      expect(slugInput).toHaveAttribute("id");
    });

    it("should announce errors for screen readers", async () => {
      render(<CreateWorkspaceForm />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.click(nameInput);
      await user.tab();

      await waitFor(() => {
        const errorMessage = screen.getByText(/workspace name is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it("should be keyboard navigable", async () => {
      render(<CreateWorkspaceForm />);

      const nameInput = screen.getByLabelText(/workspace name/i);
      const slugInput = screen.getByLabelText(/workspace url/i);
      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });

      nameInput.focus();
      expect(document.activeElement).toBe(nameInput);

      await user.tab();
      expect(document.activeElement).toBe(slugInput);

      await user.tab();
      // Should reach submit button or invite link depending on form state
      expect(
        document.activeElement === submitButton ||
          document.activeElement?.tagName === "A",
      ).toBe(true);
    });
  });

  describe("onSuccess callback", () => {
    it("should call onSuccess callback when provided", async () => {
      const onSuccess = vi.fn();

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ available: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: "workspace-123",
              name: "My Team",
              slug: "my-team",
            }),
        });

      render(
        <CreateWorkspaceForm
          apiBaseUrl="https://api.test.com"
          onSuccess={onSuccess}
        />,
      );

      const nameInput = screen.getByLabelText(/workspace name/i);
      await user.type(nameInput, "My Team");

      await waitFor(() => {
        expect(screen.getByText(/is available/i)).toBeInTheDocument();
      });

      const submitButton = screen.getByRole("button", {
        name: /create workspace/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledWith({
          id: "workspace-123",
          name: "My Team",
          slug: "my-team",
        });
      });
    });
  });
});
