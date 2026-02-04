import { redirect } from "next/navigation";

export default function WorkspaceSelectedPage() {
  redirect("/dashboard/users");
}
