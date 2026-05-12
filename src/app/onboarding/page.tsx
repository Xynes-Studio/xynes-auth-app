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
 *
 * WSA-FIX-2 (2026-05-12): Reads the optional `?redirect=<url>` search param and
 * forwards it to `CreateWorkspaceForm` as `redirectUrl`. This lets the
 * post-create redirect honour the origin app (e.g. CMS Console links here with
 * `?redirect=<cms-landing>`; the Auth Admin switcher links here without a
 * `redirect` param so users stay in Auth Admin after creating a workspace).
 * The form continues to validate `redirectUrl` against
 * `getAllowedRedirectDomains()` — open-redirect protection is unchanged.
 *
 * Next.js 15: `searchParams` is asynchronous on RSCs and must be awaited
 * before its properties are read.
 */
type OnboardingSearchParams = Record<string, string | string[] | undefined>;

function pickRedirectParam(
  value: string | string[] | undefined,
): string | undefined {
  if (Array.isArray(value)) {
    const first = value.find(
      (entry) => typeof entry === "string" && entry.trim() !== "",
    );
    return first?.trim() || undefined;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return undefined;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<OnboardingSearchParams>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const redirectUrl = pickRedirectParam(resolvedSearchParams.redirect);

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

        <CreateWorkspaceForm redirectUrl={redirectUrl} />

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
