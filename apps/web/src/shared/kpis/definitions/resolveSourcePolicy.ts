import type {
  KpiSourcePolicy,
  KpiSurfaceKind,
} from "@/shared/kpis/contracts/kpiTypes";

export function resolveSourcePolicy(args: {
  surface: KpiSurfaceKind;
  scoped: boolean;
}): KpiSourcePolicy {
  if (args.surface === "kpi_strip" && !args.scoped) {
    return "prefer_totals";
  }

  if (args.surface === "supervisor_pulse" && !args.scoped) {
    return "prefer_totals";
  }

  if (
    args.surface === "parity" ||
    args.surface === "workforce_table" ||
    args.surface === "risk_strip" ||
    args.surface === "scorecard" ||
    args.scoped
  ) {
    return "atomic_only";
  }

  return "prefer_atomic";
}   