export type AppRole =
  | "TECH"
  | "ITG_SUPERVISOR"
  | "COMPANY_MANAGER"
  | "BP_SUPERVISOR"
  | "BP_LEAD"
  | "BP_OWNER"
  | "UNKNOWN";

export type RoleNavItem = {
  key: string;
  label: string;
  href: string;
};

export function buildRoleNav(role: AppRole): RoleNavItem[] {
  if (role === "TECH") {
    return [
      { key: "home", label: "Home", href: "/home" },
      { key: "metrics", label: "Tech Metrics", href: "/tech/metrics" },
      { key: "schedule", label: "Schedule", href: "/tech/schedule" },
      { key: "dispatch", label: "Dispatch Console", href: "/dispatch-console" },
      { key: "fieldlog", label: "Field Log", href: "/tech/field-log" },
    ];
  }

  if (role === "ITG_SUPERVISOR") {
    return [
      { key: "home", label: "Home", href: "/home" },
      { key: "supervisor", label: "Team Metrics", href: "/company-supervisor" },
      { key: "dispatch", label: "Dispatch Console", href: "/dispatch-console" },
      { key: "fieldlog", label: "Field Log", href: "/field-log" },
    ];
  }

  if (role === "COMPANY_MANAGER") {
    return [
      { key: "home", label: "Home", href: "/home" },
      { key: "manager", label: "Team Metrics", href: "/company-manager" },
      { key: "dispatch", label: "Dispatch Console", href: "/dispatch-console" },
      { key: "fieldlog", label: "Field Log", href: "/field-log" },
    ];
  }

  if (
    role === "BP_SUPERVISOR" ||
    role === "BP_LEAD" ||
    role === "BP_OWNER"
  ) {
    return [
      { key: "home", label: "Home", href: "/home" },
      { key: "bpview", label: "Team Metrics", href: "/bp/view" },
      { key: "dispatch", label: "Dispatch Console", href: "/dispatch-console" },
      { key: "fieldlog", label: "Field Log", href: "/field-log" },
    ];
  }

  return [{ key: "home", label: "Home", href: "/home" }];
}