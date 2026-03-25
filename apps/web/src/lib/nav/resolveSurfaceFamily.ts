export type SurfaceFamily =
  | "TECH"
  | "BP"
  | "ITG_SUPERVISOR"
  | "COMPANY_MANAGER"
  | "LOCATE"
  | "FULFILLMENT_LEGACY"
  | "UNKNOWN";

export function resolveSurfaceFamily(
  pathname: string,
  lob: "FULFILLMENT" | "LOCATE"
): SurfaceFamily {
  if (lob === "LOCATE") return "LOCATE";

  // TECH routes
  if (pathname === "/tech" || pathname.startsWith("/tech/")) {
    return "TECH";
  }

  // ITG Supervisor V2 surface
  if (pathname === "/company-supervisor" || pathname.startsWith("/company-supervisor/")) {
    return "ITG_SUPERVISOR";
  }

  // Company Manager V2 surface
  if (pathname === "/company-manager" || pathname.startsWith("/company-manager/")) {
    return "COMPANY_MANAGER";
  }

  // BP V2 surface + shared operational modules
  if (
    pathname === "/bp/view" ||
    pathname.startsWith("/bp/view/") ||
    pathname.startsWith("/dispatch-console") ||
    pathname.startsWith("/field-log")
  ) {
    return "BP";
  }

  // Everything else (old fulfillment world)
  return "FULFILLMENT_LEGACY";
}