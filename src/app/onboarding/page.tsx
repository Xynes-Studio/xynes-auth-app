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
      <div className="w-full max-w-2xl space-y-10">
        <div className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground shadow-lg">
              X
            </div>
          </div>
          <h1 className="text-balance text-3xl font-semibold text-foreground">
            Welcome to Xynes
          </h1>
          <p className="mt-2 text-pretty text-sm text-foreground/70">
            Create your first workspace so you can invite your team and start
            collaborating.
          </p>
        </div>

        <CreateWorkspaceForm />

        <footer className="text-center">
          <p className="text-xs text-foreground/70">
            Need help?{" "}
            <a
              href="https://docs.xynes.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Read our documentation
            </a>{" "}
            or{" "}
            <a
              href="mailto:support@xynes.com"
              className="text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              contact support
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}
