"use client";

import { AuthSplitLayout } from "@/components/auth/layout/AuthSplitLayout";
import { ForgotPasswordForm } from "@/components/auth/forms/ForgotPasswordForm";
import { AuthRouteSwitch } from "@/components/auth/navigation/AuthRouteSwitch";

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout>
      <div className="w-full max-w-md space-y-6">
        <AuthRouteSwitch
          showBackButton
          showRouteLinks={false}
          backMode="history-or-href"
          backHref="/login"
          backLabel="Back"
        />
        <div className="space-y-6">
          <div>
            <h1 className="font-title-serif text-2xl font-semibold text-foreground">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </AuthSplitLayout>
  );
}
