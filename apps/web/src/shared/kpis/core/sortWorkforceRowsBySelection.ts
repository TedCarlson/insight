import type { WorkforceMetricCell } from "@/shared/kpis/engine/workforceTypes";

export type WorkforceSortKey =
  | "composite"
  | "tnps_score"
  | "ftr_rate"
  | "tool_usage_rate"
  | "pht_pure_pass_rate"
  | "contact_48hr_rate"
  | "repeat_rate"
  | "rework_rate"
  | "soi_rate"
  | "met_rate";

type Row = {
  composite_score?: number | null;
  tech_id?: string | null;
  metrics: WorkforceMetricCell[];
};

const SORT_DIRECTION_BY_KEY: Record<WorkforceSortKey, "HIGHER" | "LOWER"> = {
  composite: "HIGHER",
  tnps_score: "HIGHER",
  ftr_rate: "HIGHER",
  tool_usage_rate: "HIGHER",
  pht_pure_pass_rate: "HIGHER",
  contact_48hr_rate: "HIGHER",
  repeat_rate: "LOWER",
  rework_rate: "LOWER",
  soi_rate: "HIGHER",
  met_rate: "HIGHER",
};

function compareMetric(
  a: number | null,
  b: number | null,
  direction: "HIGHER" | "LOWER"
) {
  const av =
    a == null || !Number.isFinite(a)
      ? direction === "LOWER"
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY
      : a;

  const bv =
    b == null || !Number.isFinite(b)
      ? direction === "LOWER"
        ? Number.POSITIVE_INFINITY
        : Number.NEGATIVE_INFINITY
      : b;

  return direction === "LOWER" ? av - bv : bv - av;
}

export function sortWorkforceRowsBySelection<T extends Row>(args: {
  rows: T[];
  sortKey: WorkforceSortKey;
}) {
  const { rows, sortKey } = args;
  const cloned = [...rows];

  if (sortKey === "composite") {
    return cloned.sort((a, b) => {
      const av =
        typeof a.composite_score === "number" && Number.isFinite(a.composite_score)
          ? a.composite_score
          : Number.NEGATIVE_INFINITY;
      const bv =
        typeof b.composite_score === "number" && Number.isFinite(b.composite_score)
          ? b.composite_score
          : Number.NEGATIVE_INFINITY;

      if (bv !== av) return bv - av;
      return String(a.tech_id ?? "").localeCompare(String(b.tech_id ?? ""));
    });
  }

  const direction = SORT_DIRECTION_BY_KEY[sortKey];

  return cloned.sort((a, b) => {
    const am = a.metrics.find((m) => m.kpi_key === sortKey);
    const bm = b.metrics.find((m) => m.kpi_key === sortKey);

    const ar =
      typeof am?.rank_value === "number" && Number.isFinite(am.rank_value)
        ? am.rank_value
        : Number.POSITIVE_INFINITY;
    const br =
      typeof bm?.rank_value === "number" && Number.isFinite(bm.rank_value)
        ? bm.rank_value
        : Number.POSITIVE_INFINITY;

    if (ar !== br) return ar - br;

    const byValue = compareMetric(am?.value ?? null, bm?.value ?? null, direction);
    if (byValue !== 0) return byValue;

    const ac =
      typeof a.composite_score === "number" && Number.isFinite(a.composite_score)
        ? a.composite_score
        : Number.NEGATIVE_INFINITY;
    const bc =
      typeof b.composite_score === "number" && Number.isFinite(b.composite_score)
        ? b.composite_score
        : Number.NEGATIVE_INFINITY;

    if (bc !== ac) return bc - ac;

    return String(a.tech_id ?? "").localeCompare(String(b.tech_id ?? ""));
  });
}

// path: src/shared/kpis/core/sortWorkforceRowsBySelection.ts