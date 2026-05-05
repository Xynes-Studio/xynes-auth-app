import { Metadata } from "next";
import { InviteEntryShell } from "@/components/invite/InviteEntryShell";

export const metadata: Metadata = {
  title: "Join a Workspace | Xynes",
  description:
    "Paste your invite link or code to preview and join a Xynes workspace.",
};

export default function InviteEntryPage() {
  return (
    <main>
      <InviteEntryShell />
    </main>
  );
}
