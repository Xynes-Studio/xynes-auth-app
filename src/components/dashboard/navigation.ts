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
  { key: "apps", label: "Apps", href: "/dashboard/users", icon: "users" },
  {
    key: "directory",
    label: "Directory",
    href: "/dashboard/directory",
    icon: "user",
  },
  {
    key: "access-control",
    label: "Access Control",
    href: "/dashboard/access-control",
    icon: "settings",
  },
  {
    key: "security",
    label: "Security",
    href: "/dashboard/security",
    icon: "alert",
  },
  {
    key: "integrations",
    label: "Integrations",
    href: "/dashboard/integrations",
    icon: "link",
  },
  { key: "logs", label: "Logs", href: "/dashboard/logs", icon: "reports" },
  {
    key: "billing",
    label: "Billing",
    href: "/dashboard/billing",
    icon: "info",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
  },
];
