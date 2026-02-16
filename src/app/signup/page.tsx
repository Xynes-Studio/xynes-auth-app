"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/layout/AuthSplitLayout";
import { SignupForm } from "@/components/auth/forms/SignupForm";
import { AuthRouteSwitch } from "@/components/auth/navigation/AuthRouteSwitch";
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
    <AuthSplitLayout>
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
            We&apos;ve sent you a verification link. Please check your email to
            complete your registration.
          </p>
          <div
            role="status"
            className="rounded-md border border-blue-200 bg-blue-50 p-4 text-left"
          >
            <h2 className="text-sm font-semibold text-blue-900">
              Didn&apos;t receive the email?
            </h2>
            <p className="mt-1 text-sm text-blue-800">
              Check your spam folder or try signing up again.
            </p>
          </div>
        </div>
      ) : (
        <>
          <AuthRouteSwitch />
          <SignupForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
        </>
      )}
    </AuthSplitLayout>
  );
}

export default function SignupPage() {
  return <SignupContent />;
}
