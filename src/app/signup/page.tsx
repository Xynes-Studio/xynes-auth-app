"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert, Card } from "@lumia-ui/components";
import { SignupForm } from "@/components/auth/SignupForm";
import { AuthPageSkeleton } from "@/components/ui";
import { getSafeRedirectUrl } from "@/lib/redirect";

function SignupContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";
  const redirectUrl = getSafeRedirectUrl(
    redirectParam,
    "/onboarding",
    (
      process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS ||
      "xynes.com,localhost:3000"
    ).split(","),
  );
  const [emailSent, setEmailSent] = useState(false);

  const handleSuccess = (needsEmailVerification: boolean) => {
    if (needsEmailVerification) {
      setEmailSent(true);
    } else {
      // If no email verification needed, redirect immediately
      window.location.href = redirectUrl || "/onboarding";
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md border border-border/70 bg-card p-8 shadow-xl">
        <div className="space-y-6">
          {emailSent ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <svg
                  className="h-6 w-6 text-emerald-600"
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
              <h1 className="text-balance text-2xl font-semibold text-foreground">
                Check your email
              </h1>
              <p className="text-sm text-foreground/70 text-pretty">
                We&apos;ve sent you a verification link. Please check your email
                to complete your registration.
              </p>
              <Alert
                variant="info"
                title="Didn't receive the email?"
                description="Check your spam folder or try signing up again."
                className="text-left"
              />
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-balance text-2xl font-semibold text-foreground">
                  Create your account
                </h1>
                <p className="mt-2 text-sm text-foreground/70 text-pretty">
                  Get started with Xynes today
                </p>
              </div>

              <SignupForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

function SignupLoading() {
  return (
    <AuthPageSkeleton title="Loading signup" showForm={true} showOAuth={true} />
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupContent />
    </Suspense>
  );
}
