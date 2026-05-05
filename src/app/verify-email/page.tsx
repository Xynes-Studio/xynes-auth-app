"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/layout/AuthSplitLayout";
import { AuthRouteSwitch } from "@/components/auth/navigation/AuthRouteSwitch";
import { VerifyEmailForm } from "@/components/auth/forms/VerifyEmailForm";
import { getAllowedRedirectDomains, getSafeRedirectUrl } from "@/lib/redirect";

function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const redirectParam = searchParams.get("redirect") || "";
  const redirectUrl = getSafeRedirectUrl(
    redirectParam,
    "/onboarding",
    getAllowedRedirectDomains(),
  );

  return (
    <div className="w-full max-w-md space-y-6">
      <AuthRouteSwitch
        showBackButton
        showRouteLinks={false}
        backMode="history-or-href"
        backHref="/signup"
        backLabel="Back"
      />
      <div className="space-y-6">
        <div>
          <h1 className="font-title-serif text-2xl font-semibold text-foreground">
            Verify your email
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the verification code sent to{" "}
            <span className="font-medium text-foreground">
              {email || "your email"}
            </span>
            .
          </p>
        </div>
        <VerifyEmailForm initialEmail={email} redirectUrl={redirectUrl} />
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthSplitLayout>
      <Suspense fallback={null}>
        <VerifyEmailClient />
      </Suspense>
    </AuthSplitLayout>
  );
}
