"use client";

import Link from "next/link";
import { Card } from "@lumia-ui/components";
import { InviteEntryForm } from "@/components/invite/InviteEntryForm";

export function InviteEntryShell() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md border border-border/70 bg-card p-8 shadow-xl">
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-balance text-2xl font-semibold text-foreground">
              Join a workspace
            </h1>
            <p className="mt-2 text-sm text-foreground/70 text-pretty">
              Paste your invite link or code to continue.
            </p>
          </div>

          <InviteEntryForm />

          <div className="text-center">
            <Link
              href="/onboarding"
              className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Back to onboarding
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
