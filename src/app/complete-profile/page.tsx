"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/layout/AuthSplitLayout";
import { AuthRouteSwitch } from "@/components/auth/navigation/AuthRouteSwitch";
import { CompleteProfileForm } from "@/components/auth/forms/CompleteProfileForm";
import { getAllowedRedirectDomains, getSafeRedirectUrl } from "@/lib/redirect";

function CompleteProfileSearch() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";
  const redirectUrl = getSafeRedirectUrl(
    redirectParam,
    "/dashboard/apps",
    getAllowedRedirectDomains(),
  );

  return (
    <div className="w-full max-w-md space-y-6">
      <AuthRouteSwitch showRouteLinks={false} />
      <div className="space-y-6">
        <div>
          <h1 className="font-title-serif text-2xl font-semibold text-foreground">
            Complete your profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your full name to continue.
          </p>
        </div>
        <CompleteProfileForm redirectUrl={redirectUrl} />
      </div>
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <AuthSplitLayout>
      <Suspense fallback={null}>
        <CompleteProfileSearch />
      </Suspense>
    </AuthSplitLayout>
  );
}
