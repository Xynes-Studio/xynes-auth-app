"use client";

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

  const handleSuccess = ({
    needsEmailVerification,
    email,
  }: {
    needsEmailVerification: boolean;
    email: string;
  }) => {
    if (needsEmailVerification) {
      const query = new URLSearchParams();
      if (email) {
        query.set("email", email);
      }
      if (redirectUrl) {
        query.set("redirect", redirectUrl);
      }
      window.location.href = `/verify-email${
        query.toString() ? `?${query.toString()}` : ""
      }`;
    } else {
      // If no email verification needed, redirect immediately
      window.location.href = redirectUrl || "/onboarding";
    }
  };

  return (
    <AuthSplitLayout>
      <>
        <AuthRouteSwitch />
        <SignupForm onSuccess={handleSuccess} redirectUrl={redirectUrl} />
      </>
    </AuthSplitLayout>
  );
}

export default function SignupPage() {
  return <SignupContent />;
}
