import type { Metadata } from "next";
import { CreateInvitePageClient } from "@/components/invite/CreateInvitePageClient";

export const metadata: Metadata = {
  title: "Invite a Teammate | Xynes",
  description: "Invite a teammate to join your current Xynes workspace.",
};

export default function CreateWorkspaceInvitePage() {
  return <CreateInvitePageClient />;
}
