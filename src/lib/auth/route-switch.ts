export type AuthRouteVariant = "login" | "signup";

function normalizePathname(pathname: string): string {
  const pathOnly = pathname.split("?")[0]?.split("#")[0] ?? "";
  return pathOnly.trim().toLowerCase();
}

export function getAuthRouteVariant(pathname: string): AuthRouteVariant {
  const normalizedPath = normalizePathname(pathname);

  if (
    normalizedPath === "/signup" ||
    normalizedPath === "/sign-up" ||
    normalizedPath.startsWith("/signup/") ||
    normalizedPath.startsWith("/sign-up/")
  ) {
    return "signup";
  }

  return "login";
}

export function isAuthRouteActive(
  pathname: string,
  route: AuthRouteVariant,
): boolean {
  return getAuthRouteVariant(pathname) === route;
}
