"use client";

import { useSearchParams } from "next/navigation";
import { AuthSplitLayout } from "@/components/auth/layout/AuthSplitLayout";
import { AuthRouteSwitch } from "@/components/auth/navigation/AuthRouteSwitch";
import { CompleteProfileForm } from "@/components/auth/forms/CompleteProfileForm";
import { getSafeRedirectUrl } from "@/lib/redirect";

export default function CompleteProfilePage() {
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "";
  const redirectUrl = getSafeRedirectUrl(
    redirectParam,
    "/dashboard/apps",
    (
      process.env.NEXT_PUBLIC_ALLOWED_REDIRECT_DOMAINS ||
      "xynes.com,localhost:3000"
    ).split(","),
  );

  return (
    <AuthSplitLayout>
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
    </AuthSplitLayout>
  );
}
