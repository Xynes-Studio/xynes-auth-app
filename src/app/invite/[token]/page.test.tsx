import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/test-utils';
import { InvitePreview } from '@/components/invite/InvitePreview';
import { useAuth, useInvite } from '@xynes/auth-sdk';

// Mock the hooks
// Mock the hooks
vi.mock('@xynes/auth-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@xynes/auth-sdk')>();
  return {
    ...actual,
    useAuth: vi.fn(),
    useInvite: vi.fn(),
  };
});

// Mock next/navigation
const mockPush = vi.fn();
const mockSearchParamsGet = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
  useSearchParams: vi.fn(() => ({
    get: mockSearchParamsGet,
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
    mockSearchParamsGet.mockReturnValue(null);
    mockPush.mockReset();
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
    expect(screen.getByText(/You have been invited to join a workspace/i)).toBeInTheDocument();
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
    expect(screen.getByText(new RegExp(mockInvite.inviterEmail))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockInvite.role.replace('_', ' '), 'i'))).toBeInTheDocument();
    expect(screen.getByText(/You are signed in as/i)).toBeInTheDocument();
  });

  it('renders invite role from roleKey when role is missing', () => {
    const inviteWithRoleKeyOnly = {
      ...mockInvite,
      role: undefined,
      roleKey: 'workspace_member' as const,
    } as unknown as typeof mockInvite;

    const useInviteMock = vi.fn().mockReturnValue({
      invite: inviteWithRoleKeyOnly,
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

    expect(screen.getByText(/workspace member/i)).toBeInTheDocument();
  });

  it('renders invite details from envelope-shaped response payload', () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: {
        ok: true,
        data: {
          workspaceName: 'Acme Workspace',
          inviterName: 'Owner User',
          roleKey: 'workspace_member',
          status: 'pending',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
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

    expect(screen.getByText(/Acme Workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Owner User/i)).toBeInTheDocument();
    expect(screen.getByText(/workspace member/i)).toBeInTheDocument();
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
    expect(screen.getByText(new RegExp(mockInvite.inviterEmail))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(mockInvite.role.replace('_', ' '), 'i'))).toBeInTheDocument();
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

  it('shows error when API returns a generic error', () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: false,
      error: { code: 'unknown_error', message: 'Something went wrong' },
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

  it('shows customized error when invite is not found', () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: false,
      error: { code: 'invite_not_found', message: 'Not Found' },
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
    expect(screen.getByText(/The invitation code could not be found or has expired./i)).toBeInTheDocument();
  });

  it('shows customized error when user is already a member', () => {
    const useInviteMock = vi.fn().mockReturnValue({
      invite: null,
      isLoading: false,
      error: { code: 'already_in_workspace', message: 'Already Member' },
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

    expect(screen.getByRole('heading', { name: /Already a Member/i })).toBeInTheDocument();
    expect(screen.getByText(/You are already a member of this workspace./i)).toBeInTheDocument();
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

  it('redirects to /dashboard/apps after accept when API response has no workspace slug', async () => {
    const mockAcceptInvite = vi.fn().mockResolvedValue({
      accepted: true,
      workspaceId: 'workspace-123',
      roleKey: 'workspace_member',
      workspaceMemberCreated: true,
    });

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
      expect(mockPush).toHaveBeenCalledWith('/dashboard/apps');
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

    expect(mockRedirectToLogin).toHaveBeenCalledWith(`/invite/test-token?autoAccept=true`);
  });

  it('automatically accepts invite when authenticated and autoAccept param is true', async () => {
    mockSearchParamsGet.mockReturnValue('true');
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

    await waitFor(() => {
      expect(mockAcceptInvite).toHaveBeenCalled();
    });
  });
});
