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

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { key: "apps", label: "Apps", href: "/dashboard/apps", icon: "package" },
  {
    key: "directory",
    label: "Directory",
    href: "/dashboard/directory",
    icon: "users-round",
  },
  {
    key: "access-control",
    label: "Access Control",
    href: "/dashboard/access-control",
    icon: "folder-key",
  },
  {
    key: "security",
    label: "Security",
    href: "/dashboard/security",
    icon: "lock",
  },
  {
    key: "integrations",
    label: "Integrations",
    href: "/dashboard/integrations",
    icon: "link",
  },
  { key: "logs", label: "Logs", href: "/dashboard/logs", icon: "file-text" },
  {
    key: "billing",
    label: "Billing",
    href: "/dashboard/billing",
    icon: "dollar-sign",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
  },
];
