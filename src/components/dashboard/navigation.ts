export type AuthDashboardNavKey =
  | "users"
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
  { key: "users", label: "Users", href: "/dashboard/users", icon: "users" },
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
    icon: "alert",
  },
  {
    key: "security",
    label: "Security",
    href: "/dashboard/security",
    icon: "check",
  },
  {
    key: "integrations",
    label: "Integrations",
    href: "/dashboard/integrations",
    icon: "link",
  },
  { key: "logs", label: "Logs", href: "/dashboard/logs", icon: "list" },
  {
    key: "billing",
    label: "Billing",
    href: "/dashboard/billing",
    icon: "reports",
  },
  {
    key: "settings",
    label: "Settings",
    href: "/dashboard/settings",
    icon: "settings",
  },
];
