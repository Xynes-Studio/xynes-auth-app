"use client";

import { AuthGuard } from "@xynes/auth-sdk";
import { AuthDashboardShell } from "@/components/dashboard";
import { ProfileComingSoon } from "@/components/profile/ProfileComingSoon";

/**
 * /profile — BUG-AUTH-3a placeholder route.
 *
 * Reached by clicking "Profile" in the dashboard avatar menu (see
 * `AuthDashboardShell` → `onProfileOpen`). The real self-service editor is
 * a future story; this route exists so the menu action lands on a polished
 * "Coming soon" surface that still sits inside the dashboard shell (sidebar
 * visible, scroll containment honoured).
 *
 * `activeNav` is set to "settings" as a closed-type-safe default — none of
 * the sidebar items will visually highlight because `usePathname()` returns
 * "/profile" which does not match any nav `href`. This is the intended UX:
 * the avatar-menu destination has no sidebar mirror.
 */
export default function ProfileDashboardPage() {
  return (
    <AuthGuard>
      <AuthDashboardShell activeNav="settings">
        <ProfileComingSoon />
      </AuthDashboardShell>
    </AuthGuard>
  );
}
