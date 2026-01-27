"use client";

import { Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@lumia-ui/components";
import { LoginForm } from "@/components/LoginForm";
import { AuthPageSkeleton } from "@/components/ui";
import { getSafeRedirectUrl } from "@/lib/redirect";

/**
 * Allowed redirect domains for security validation.
 * Prevents open redirect attacks.
 */
const ALLOWED_REDIRECT_DOMAINS = (
  process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS || "xynes.com,localhost:3000"
).split(",");

/**
 * Default redirect URL after successful login.
 */
const DEFAULT_REDIRECT = "/onboarding";

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  // Validate redirect URL to prevent open redirect attacks
  const redirectUrl = getSafeRedirectUrl(
    redirectParam || "",
    DEFAULT_REDIRECT,
    ALLOWED_REDIRECT_DOMAINS
  );

  const handleSuccess = useCallback(() => {
    // Redirect to the validated URL after successful login
    window.location.href = redirectUrl;
  }, [redirectUrl]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account to continue
            </p>
          </div>

          <LoginForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
        </div>
      </Card>
    </div>
  );
}

function LoginLoading() {
  return <AuthPageSkeleton title="Loading login" showForm={true} showOAuth={true} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
