'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@lumia-ui/components';
import { Alert } from '@lumia-ui/components';
import { SignupForm } from '@/components/SignupForm';

export default function SignupPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || undefined;
  const [emailSent, setEmailSent] = useState(false);

  const handleSuccess = (needsEmailVerification: boolean) => {
    if (needsEmailVerification) {
      setEmailSent(true);
    } else {
      // If no email verification needed, redirect immediately
      window.location.href = redirectUrl || '/onboarding';
    }
  };

  if (emailSent) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Check your email</h1>
            <p className="text-muted-foreground">
              We&apos;ve sent you a verification link. Please check your email to complete your
              registration.
            </p>
            <Alert
              variant="info"
              title="Didn't receive the email?"
              description="Check your spam folder or try signing up again."
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">Create your account</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started with Xynes today
            </p>
          </div>

          <SignupForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
        </div>
      </Card>
    </div>
  );
}
