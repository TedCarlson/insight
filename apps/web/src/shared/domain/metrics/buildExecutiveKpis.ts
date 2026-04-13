// path: apps/web/src/shared/domain/metrics/buildExecutiveKpis.ts

import type { MetricsExecutiveComparisonState } from "@/shared/types/metrics/executiveStrip";

type ScoreRow = {
  tech_id: string;
  metric_key: string;
  metric_value: number | null;
  band_key: string | null;
  weighted_points: number | null;
  numerator?: number | null;
  denominator?: number | null;
};

type DefinitionRow = {
  profile_key: string;
  kpi_key: string;
  label: string;
  customer_label: string;
  raw_label_identifier: string;
  direction: string | null;
  sort_order: number;
  report_order: number | null;
};

type RubricRow = {
  band_key: string;
  min_value: number | null;
  max_value: number | null;
};

type BandKey =
  | "EXCEEDS"
  | "MEETS"
  | "NEEDS_IMPROVEMENT"
  | "MISSES"
  | "NO_DATA";

type ExecutiveKpiItem = {
  kpi_key: string;
  label: string;
  value_display: string;
  band_key: BandKey;
  band_label: string;
  support?: string | null;
  comparison_scope_code: string;
  comparison_value_display: string;
  variance_display: string | null;
  comparison_state: MetricsExecutiveComparisonState;
};

type Args = {
  definitions: DefinitionRow[];
  supervisorScores: ScoreRow[];
  orgScores: ScoreRow[];
  rubricByKpi: Map<string, RubricRow[]>;
  support?: string | null;
  comparison_scope_code: string;
};

function sum(values: Array<number | null | undefined>): number | null {
  const nums = values.filter(
    (v): v is number => typeof v === "number" && Number.isFinite(v)
  );
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0);
}

function format(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
}

function normalizeBandKey(value: string | null | undefined): BandKey {
  if (value === "EXCEEDS") return "EXCEEDS";
  if (value === "MEETS") return "MEETS";
  if (value === "NEEDS_IMPROVEMENT") return "NEEDS_IMPROVEMENT";
  if (value === "MISSES") return "MISSES";
  return "NO_DATA";
}

function bandLabel(bandKey: BandKey): string {
  if (bandKey === "EXCEEDS") return "Exceeds";
  if (bandKey === "MEETS") return "Meets";
  if (bandKey === "NEEDS_IMPROVEMENT") return "Needs Improvement";
  if (bandKey === "MISSES") return "Misses";
  return "No Data";
}

function hasAnyData(rows: ScoreRow[]): boolean {
  return rows.some(
    (row) =>
      (typeof row.metric_value === "number" && Number.isFinite(row.metric_value)) ||
      (typeof row.numerator === "number" && Number.isFinite(row.numerator)) ||
      (typeof row.denominator === "number" && Number.isFinite(row.denominator))
  );
}

function computeTnpsValue(rows: ScoreRow[]): number | null {
  const totalPromoters = sum(rows.map((r) => r.numerator));
  const totalSurveys = sum(rows.map((r) => r.denominator));

  if (
    totalPromoters == null ||
    totalSurveys == null ||
    !Number.isFinite(totalPromoters) ||
    !Number.isFinite(totalSurveys) ||
    totalSurveys <= 0
  ) {
    return null;
  }

  let totalDetractors = 0;

  for (const row of rows) {
    if (
      typeof row.metric_value === "number" &&
      Number.isFinite(row.metric_value) &&
      typeof row.denominator === "number" &&
      Number.isFinite(row.denominator) &&
      row.denominator > 0
    ) {
      const rowPromoters =
        typeof row.numerator === "number" && Number.isFinite(row.numerator)
          ? row.numerator
          : 0;

      const derivedDetractors =
        (((rowPromoters / row.denominator) * 100 - row.metric_value) *
          row.denominator) /
        100;

      if (Number.isFinite(derivedDetractors)) {
        totalDetractors += Math.max(0, derivedDetractors);
      }
    }
  }

  return ((totalPromoters - totalDetractors) / totalSurveys) * 100;
}

function computeKpiValue(rows: ScoreRow[], metricKey: string): number | null {
  if (!rows.length) return null;

  if (metricKey === "tnps_score") {
    return computeTnpsValue(rows);
  }

  const numerator = sum(rows.map((r) => r.numerator));
  const denominator = sum(rows.map((r) => r.denominator));

  if (
    numerator != null &&
    denominator != null &&
    Number.isFinite(numerator) &&
    Number.isFinite(denominator) &&
    denominator > 0
  ) {
    return (numerator / denominator) * 100;
  }

  return null;
}

function resolveBandFromRubric(args: {
  rows: ScoreRow[];
  value: number | null;
  rubricRows: RubricRow[];
}): BandKey {
  if (!hasAnyData(args.rows)) {
    return "NO_DATA";
  }

  if (args.value == null || !Number.isFinite(args.value)) {
    return "NO_DATA";
  }

  for (const row of args.rubricRows) {
    const bandKey = normalizeBandKey(row.band_key);
    if (bandKey === "NO_DATA") continue;

    const meetsMin = row.min_value == null || args.value >= row.min_value;
    const meetsMax = row.max_value == null || args.value <= row.max_value;

    if (meetsMin && meetsMax) {
      return bandKey;
    }
  }

  return "NO_DATA";
}

function resolveComparison(
  scopeValue: number | null,
  orgValue: number | null,
  direction: string | null
): {
  comparison_value_display: string;
  variance_display: string | null;
  comparison_state: MetricsExecutiveComparisonState;
} {
  if (
    scopeValue == null ||
    orgValue == null ||
    !Number.isFinite(scopeValue) ||
    !Number.isFinite(orgValue)
  ) {
    return {
      comparison_value_display: "—",
      variance_display: null,
      comparison_state: "neutral",
    };
  }

  const delta = scopeValue - orgValue;

  if (Math.abs(delta) < 0.000001) {
    return {
      comparison_value_display: format(orgValue),
      variance_display: "0.0",
      comparison_state: "neutral",
    };
  }

  const better =
    String(direction ?? "").toUpperCase() === "LOWER_BETTER"
      ? delta < 0
      : delta > 0;

  return {
    comparison_value_display: format(orgValue),
    variance_display: `${delta > 0 ? "+" : ""}${format(delta)}`,
    comparison_state: better ? "better" : "worse",
  };
}

export function buildExecutiveKpis(args: Args): ExecutiveKpiItem[] {
  if (!args.definitions?.length) return [];

  return args.definitions.map((def) => {
    const supervisorRows = args.supervisorScores.filter(
      (r) => r.metric_key === def.kpi_key
    );
    const orgRows = args.orgScores.filter((r) => r.metric_key === def.kpi_key);

    const scopeValue = computeKpiValue(supervisorRows, def.kpi_key);
    const orgValue = computeKpiValue(orgRows, def.kpi_key);

    const scopeBand = resolveBandFromRubric({
      rows: supervisorRows,
      value: scopeValue,
      rubricRows: args.rubricByKpi.get(def.kpi_key) ?? [],
    });

    const comparison = resolveComparison(scopeValue, orgValue, def.direction);

    return {
      kpi_key: def.kpi_key,
      label: def.customer_label || def.label || def.kpi_key,
      value_display: format(scopeValue),
      band_key: scopeBand,
      band_label: bandLabel(scopeBand),
      support: args.support ?? null,
      comparison_scope_code: args.comparison_scope_code,
      comparison_value_display: comparison.comparison_value_display,
      variance_display: comparison.variance_display,
      comparison_state: comparison.comparison_state,
    };
  });
}