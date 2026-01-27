'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useInvite } from '@xynes/auth-sdk';
import { 
  Button, 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  Skeleton,
  Alert,
  Badge
} from '@lumia-ui/components';
import Link from 'next/link';

// Using basic SVG icons since lucide-react might not be available
const CheckCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserPlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
  </svg>
);

const BuildingIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const SpinnerIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

interface InvitePreviewProps {
  token: string;
}

export function InvitePreview({ token }: InvitePreviewProps) {
  const router = useRouter();
  const { isAuthenticated, redirectToLogin } = useAuth();

  // Validate environment variable
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    throw new Error('NEXT_PUBLIC_API_URL environment variable is required for InvitePreview component');
  }

  const { invite, isLoading, error, acceptInvite, isAccepting } = useInvite(token, apiBaseUrl);
  
  // Handle invite acceptance
  const handleAccept = async () => {
    const workspace = await acceptInvite();
    if (workspace) {
      const consoleUrl = process.env.NEXT_PUBLIC_CONSOLE_URL || '';
      if (consoleUrl) {
        // Redirect to workspace dashboard in console app
        window.location.href = `${consoleUrl}/${workspace.slug}`;
      } else {
        // Fallback to home if console URL not configured
        router.push('/');
      }
    }
  };

  // If invite is expired or cancelled, show error
  if (invite && (invite.status === 'expired' || invite.status === 'cancelled')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md" aria-labelledby="invite-error-title" role="alertdialog" aria-modal="true">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100" aria-hidden="true">
              <XCircleIcon className="h-8 w-8 text-red-600" aria-hidden="true" />
            </div>
            <CardTitle id="invite-error-title" className="mt-4">Invite Not Valid</CardTitle>
            <CardDescription id="invite-error-desc">
              {invite.status === 'expired' 
                ? 'This invitation has expired.' 
                : 'This invitation has been cancelled.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-sm text-muted-foreground" id="contact-info">
              Contact the workspace owner for a new invitation.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button 
              className="w-full" 
              onClick={() => router.push('/')}
              aria-describedby="invite-error-desc contact-info"
            >
              Go to Home
            </Button>
            {!isAuthenticated && (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => redirectToLogin()}
                aria-describedby="invite-error-desc"
              >
                Sign In
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card 
        className="w-full max-w-md" 
        aria-labelledby="invite-title" 
        role="region" 
        aria-label="Invite Preview"
      >
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100" aria-hidden="true">
            <UserPlusIcon className="h-8 w-8 text-blue-600" aria-hidden="true" />
          </div>
          <CardTitle id="invite-title">Join Workspace</CardTitle>
          <CardDescription id="invite-description">You have been invited to join a workspace</CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div 
              className="space-y-4" 
              data-testid="loading-state"
              role="status"
              aria-live="polite"
              aria-label="Loading invite information..."
            >
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full mt-6" />
            </div>
          ) : error ? (
            <Alert 
              variant="error" 
              data-testid="error-state"
              role="alert"
              aria-live="assertive"
              description={error.message}
            >
              {/* Icon is auto-handled by Alert in lumia-ds */}
            </Alert>
          ) : invite ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                  <BuildingIcon className="h-5 w-5 text-gray-500" aria-hidden="true" />
                  <h2 className="text-xl font-semibold" id="workspace-name">{invite.workspaceName}</h2>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <span
                    className="text-sm text-muted-foreground"
                    id="inviter-details"
                    aria-label={`Invited by ${invite.inviterName} (${invite.inviterEmail})`}
                  >
                    Invited by <span className="font-medium">{invite.inviterName}</span> ({invite.inviterEmail})
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mb-4">
                  <Badge
                    variant="subtle"
                    className="capitalize"
                    aria-label={`Role: ${invite.role.replace(/_/g, ' ')}`}
                  >
                    {invite.role.replace(/_/g, ' ')}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground" id="expiry-info">
                  <ClockIcon className="h-4 w-4" aria-hidden="true" />
                  <span>
                    Expires: {new Date(invite.expiresAt).toLocaleDateString()} at{' '}
                    {new Date(invite.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              
              {isAuthenticated ? (
                <div className="mt-6 space-y-2">
                  <p 
                    className="text-center text-sm text-muted-foreground"
                    id="signed-in-as"
                    aria-live="polite"
                  >
                    You are signed in as <span className="font-medium">{invite.inviteeEmail}</span>
                  </p>
                  
                  <Button
                    className="w-full"
                    onClick={handleAccept}
                    disabled={isAccepting || isLoading}
                    aria-describedby="workspace-name inviter-details expiry-info signed-in-as"
                  >
                    {isAccepting ? (
                      <>
                        <span className="sr-only">Loading</span>
                        <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Accepting...
                      </>
                    ) : (
                      <>
                        <span className="sr-only">Join</span>
                        <CheckCircleIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                        Join Workspace
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="mt-6 space-y-3">
                  <p 
                    className="text-center text-sm text-muted-foreground"
                    id="sign-in-prompt"
                  >
                    Sign in to accept this invitation
                  </p>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => redirectToLogin(`/invite/${token}`)}
                    aria-describedby="workspace-name inviter-details expiry-info sign-in-prompt"
                  >
                    Sign In to Continue
                  </Button>
                  
                  <p className="text-center text-xs text-muted-foreground pt-2">
                    {'Do not'} have an account?{' '}
                    <Link
                      href="/signup"
                      className="underline focus:outline-none focus:ring-2 focus:ring-primary focus:rounded"
                    >
                      Sign up
                    </Link>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p 
                className="text-sm text-muted-foreground"
                role="alert"
                aria-live="assertive"
              >
                Invalid or expired invitation link
              </p>
            </div>
          )}
        </CardContent>
        
        {!isLoading && !error && invite && (
          <CardFooter className="flex justify-center">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:rounded"
              aria-label="Return to home page"
            >
              Back to Home
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}