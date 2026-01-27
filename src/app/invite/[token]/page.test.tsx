import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { InvitePreview } from '@/components/invite/InvitePreview';

// Mock the hooks
vi.mock('@xynes/auth-sdk', () => ({
  useAuth: vi.fn(),
  useInvite: vi.fn(),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
  })),
}));

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:4000');

describe('InvitePreview', () => {
  const mockInvite = {
    id: 'invite-123',
    token: 'test-token',
    workspaceId: 'workspace-123',
    workspaceName: 'Test Workspace',
    inviterName: 'John Doe',
    inviterEmail: 'john@example.com',
    inviteeEmail: 'jane@example.com',
    role: 'workspace_member' as const,
    status: 'pending' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: true,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/Join Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/You've been invited to join a workspace/i)).toBeInTheDocument();
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
  });

  it('renders invite details when authenticated', () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: true,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(mockInvite.workspaceName)).toBeInTheDocument();
    expect(screen.getByText(mockInvite.inviterName)).toBeInTheDocument();
    expect(screen.getByText(mockInvite.inviterEmail)).toBeInTheDocument();
    expect(screen.getByText(/workspace_member/i)).toBeInTheDocument();
    expect(screen.getByText(/You are signed in as/i)).toBeInTheDocument();
  });

  it('renders invite details when not authenticated', () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(mockInvite.workspaceName)).toBeInTheDocument();
    expect(screen.getByText(mockInvite.inviterName)).toBeInTheDocument();
    expect(screen.getByText(mockInvite.inviterEmail)).toBeInTheDocument();
    expect(screen.getByText(/workspace_member/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign in to accept this invitation/i)).toBeInTheDocument();
  });

  it('shows error when invite is expired', () => {
    const expiredInvite = {
      ...mockInvite,
      status: 'expired' as const,
    };

    const useInviteMock = vi.fn().mockReturnValue({
      invite: expiredInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/Invite Not Valid/i)).toBeInTheDocument();
    expect(screen.getByText(/This invitation has expired./i)).toBeInTheDocument();
  });

  it('shows error when invite is cancelled', () => {
    const cancelledInvite = {
      ...mockInvite,
      status: 'cancelled' as const,
    };

    const useInviteMock = vi.fn().mockReturnValue({
      invite: cancelledInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByText(/Invite Not Valid/i)).toBeInTheDocument();
    expect(screen.getByText(/This invitation has been cancelled./i)).toBeInTheDocument();
  });

  it('shows error when API returns an error', () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: false,
      error: { code: 'invalid_invite', message: 'Invalid invite token' },
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    expect(screen.getByTestId('error-state')).toBeInTheDocument();
  });

  it('calls acceptInvite when authenticated user clicks join button', async () => {
    const mockAcceptInvite = vi.fn().mockResolvedValue(mockInvite);

    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: mockAcceptInvite,
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: true,
      redirectToLogin: vi.fn(),
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    const joinButton = screen.getByRole('button', { name: /Join Workspace/i });
    joinButton.click();

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalled();
    });
  });

  it('redirects to login when unauthenticated user clicks sign in button', () => {
    const mockRedirectToLogin = vi.fn();

    const useInviteMock = vi.fn().mockReturnValue({
      invite: mockInvite,
      isLoading: false,
      error: null,
      acceptInvite: vi.fn(),
      isAccepting: false,
    });

    const useAuthMock = vi.fn().mockReturnValue({
      isAuthenticated: false,
      redirectToLogin: mockRedirectToLogin,
    });

    vi.mocked(useInvite).mockImplementation(useInviteMock);
    vi.mocked(useAuth).mockImplementation(useAuthMock);

    renderWithProviders(<InvitePreview token="test-token" />);

    const signInButton = screen.getByRole('button', { name: /Sign In to Continue/i });
    signInButton.click();

    expect(mockRedirectToLogin).toHaveBeenCalledWith(`/invite/test-token`);
  });
});