"use client";

import { useTranslations } from "next-intl";
import { AuthSplitLayout } from "@/components/auth/layout/AuthSplitLayout";
import { ForgotPasswordForm } from "@/components/auth/forms/ForgotPasswordForm";
import { AuthRouteSwitch } from "@/components/auth/navigation/AuthRouteSwitch";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword.page");
  const tCommon = useTranslations("auth.common.routeSwitch");
  return (
    <AuthSplitLayout>
      <div className="w-full max-w-md space-y-6">
        <AuthRouteSwitch
          showBackButton
          showRouteLinks={false}
          backMode="history-or-href"
          backHref="/login"
          backLabel={tCommon("back")}
        />
        <div className="space-y-6">
          <div>
            <h1 className="font-title-serif text-2xl font-semibold text-foreground">
              {t("heading")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("subheading")}
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </div>
    </AuthSplitLayout>
  );
}
