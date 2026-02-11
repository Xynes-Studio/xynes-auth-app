"use client";

import { Card } from "@lumia-ui/components";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground">
              Forgot your password?
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>
          </div>

          <div className="flex justify-center">
            <a
              href="/login"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              Back to login
            </a>
          </div>

          <ForgotPasswordForm />
        </div>
      </Card>
    </div>
  );
}
