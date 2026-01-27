import { Metadata } from "next";
import { CreateWorkspaceForm } from "@/components/onboarding";

export const metadata: Metadata = {
  title: "Create Workspace | Xynes",
  description:
    "Create your first workspace to get started with Xynes. Set up your team and start collaborating.",
};

/**
 * Onboarding Page
 *
 * Displayed to new users who have no workspaces.
 * Provides a friendly UI for creating the first workspace.
 */
export default function OnboardingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 px-4 py-12">
      <div className="mb-8 text-center">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
            X
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Welcome to Xynes! Let&apos;s set up your workspace.
        </p>
      </div>

      <CreateWorkspaceForm />

      {/* Footer */}
      <footer className="mt-12 text-center">
        <p className="text-xs text-muted-foreground">
          Need help?{" "}
          <a
            href="https://docs.xynes.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Read our documentation
          </a>{" "}
          or{" "}
          <a
            href="mailto:support@xynes.com"
            className="text-primary hover:underline"
          >
            contact support
          </a>
        </p>
      </footer>
    </main>
  );
}
