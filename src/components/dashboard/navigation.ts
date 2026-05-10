export type AuthDashboardNavKey =
  | "apps"
  | "directory"
  | "access-control"
  | "security"
  | "integrations"
  | "logs"
  | "billing"
  | "settings";

export type DashboardNavItem = {
  key: AuthDashboardNavKey;
  label: string;
  href: string;
  icon?: string;
};

/**
 * Navigation translation key for each destination, under the
 * `auth.dashboard.navigation` namespace. Kept separate from the visible
 * label so the labels can be localized at render time without losing the
 * stable destination key the shell uses to identify the active nav.
 */
export type AuthDashboardNavMessageKey =
  | "apps"
  | "directory"
  | "accessControl"
  | "security"
  | "integrations"
  | "logs"
  | "billing"
  | "settings";

/**
 * Stable, copy-neutral spec for the Auth Admin dashboard navigation. Visible
 * labels are derived from `auth.dashboard.navigation.<messageKey>` at render
 * time so the consumer (AuthDashboardShell) owns translated copy. The default
 * English `label` field is preserved for backwards-compatible callers (tests
 * and any future server component that cannot reach `useTranslations`).
 */
export type AuthDashboardNavSpec = {
  key: AuthDashboardNavKey;
  messageKey: AuthDashboardNavMessageKey;
  href: string;
  icon?: string;
  /**
   * English fallback label. Used when a consumer passes the spec to a Lumia
   * shell mock without translating, and as the default in `DASHBOARD_NAV_ITEMS`.
   */
  defaultLabel: string;
};

export const DASHBOARD_NAV_SPECS: AuthDashboardNavSpec[] = [
  {
    key: "apps",
    messageKey: "apps",
    href: "/dashboard/apps",
    icon: "package",
    defaultLabel: "Apps",
  },
  {
    key: "directory",
    messageKey: "directory",
    href: "/dashboard/directory",
    icon: "users-round",
    defaultLabel: "Directory",
  },
  {
    key: "access-control",
    messageKey: "accessControl",
    href: "/dashboard/access-control",
    icon: "folder-key",
    defaultLabel: "Access Control",
  },
  {
    key: "security",
    messageKey: "security",
    href: "/dashboard/security",
    icon: "lock",
    defaultLabel: "Security",
  },
  {
    key: "integrations",
    messageKey: "integrations",
    href: "/dashboard/integrations",
    icon: "link",
    defaultLabel: "Integrations",
  },
  {
    key: "logs",
    messageKey: "logs",
    href: "/dashboard/logs",
    icon: "file-text",
    defaultLabel: "Logs",
  },
  {
    key: "billing",
    messageKey: "billing",
    href: "/dashboard/billing",
    icon: "dollar-sign",
    defaultLabel: "Billing",
  },
  {
    key: "settings",
    messageKey: "settings",
    href: "/dashboard/settings",
    icon: "settings",
    defaultLabel: "Settings",
  },
];

/**
 * Backwards-compatible English nav item array. Prefer `DASHBOARD_NAV_SPECS`
 * + a translator in new call sites; this constant keeps existing imports
 * working and matches the original shape exactly.
 */
export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = DASHBOARD_NAV_SPECS.map(
  (spec) => ({
    key: spec.key,
    label: spec.defaultLabel,
    href: spec.href,
    icon: spec.icon,
  }),
);
