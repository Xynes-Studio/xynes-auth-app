"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

interface AuthRouteSwitchProps {
  showBackButton?: boolean;
  showRouteLinks?: boolean;
  backHref?: string;
  backLabel?: string;
  backMode?: "history-or-href" | "href";
}

export function AuthRouteSwitch({
  showBackButton = false,
  showRouteLinks = true,
  backHref = "/login",
  backLabel,
  backMode = "href",
}: AuthRouteSwitchProps = {}) {
  const t = useTranslations("auth.common.routeSwitch");
  const pathname = usePathname() ?? "/login";
  const router = useRouter();
  const isLoginActive = isAuthRouteActive(pathname, "login");
  const isSignupActive = isAuthRouteActive(pathname, "signup");
  const resolvedBackLabel = backLabel ?? t("back");

  const handleBack = () => {
    if (backMode === "history-or-href" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backHref);
  };

  return (
    <nav
      aria-label={t("ariaLabel")}
      className="font-title-serif text-lg text-foreground space-y-2"
    >
      {showBackButton ? (
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/50 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">←</span>
          <span>{resolvedBackLabel}</span>
        </button>
      ) : null}
      {showRouteLinks ? (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            aria-current={isLoginActive ? "page" : undefined}
            className={linkClasses(isLoginActive)}
          >
            {t("login")}
          </Link>
          <span
            aria-hidden="true"
            className="text-slate-500 dark:text-slate-400"
          >
            /
          </span>
          <Link
            href="/signup"
            aria-current={isSignupActive ? "page" : undefined}
            className={linkClasses(isSignupActive)}
          >
            {t("signup")}
          </Link>
        </div>
      ) : null}
    </nav>
  );
}
