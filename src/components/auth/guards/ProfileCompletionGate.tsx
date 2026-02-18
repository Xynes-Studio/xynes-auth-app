"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@xynes/auth-sdk";

const EXEMPT_PATH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/complete-profile",
  "/callback",
  "/logout",
];

function isExemptPath(pathname: string): boolean {
  return EXEMPT_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

interface ProfileCompletionGateProps {
  children: ReactNode;
}

export function ProfileCompletionGate({ children }: ProfileCompletionGateProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const { isLoading, isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (isExemptPath(pathname)) return;

    const hasDisplayName = Boolean(user?.displayName?.trim());
    if (hasDisplayName) return;

    const query = searchParams.toString();
    const currentPathWithQuery = `${pathname}${query ? `?${query}` : ""}`;
    const destination =
      currentPathWithQuery && currentPathWithQuery !== "/complete-profile"
        ? `/complete-profile?redirect=${encodeURIComponent(currentPathWithQuery)}`
        : "/complete-profile";

    router.replace(destination);
  }, [isAuthenticated, isLoading, pathname, router, searchParams, user?.displayName]);

  return <>{children}</>;
}
