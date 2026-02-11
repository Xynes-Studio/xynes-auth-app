"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isAuthRouteActive } from "@/lib/auth/route-switch";

const baseLinkClasses =
  "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 focus-visible:ring-offset-2";
const activeLinkClasses = "text-slate-900 dark:text-slate-100 opacity-100";
const inactiveLinkClasses =
  "text-slate-500 dark:text-slate-400 opacity-75 hover:text-slate-700 dark:hover:text-slate-300 hover:opacity-100";

function linkClasses(isActive: boolean): string {
  return `${baseLinkClasses} ${
    isActive ? activeLinkClasses : inactiveLinkClasses
  }`;
}

export function AuthRouteSwitch() {
  const pathname = usePathname() ?? "/login";
  const isLoginActive = isAuthRouteActive(pathname, "login");
  const isSignupActive = isAuthRouteActive(pathname, "signup");

  return (
    <nav
      aria-label="Auth route switch"
      className="font-title-serif text-lg text-foreground"
    >
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          aria-current={isLoginActive ? "page" : undefined}
          className={linkClasses(isLoginActive)}
        >
          Log In
        </Link>
        <span aria-hidden="true" className="text-slate-500 dark:text-slate-400">
          /
        </span>
        <Link
          href="/signup"
          aria-current={isSignupActive ? "page" : undefined}
          className={linkClasses(isSignupActive)}
        >
          Sign Up
        </Link>
      </div>
    </nav>
  );
}
