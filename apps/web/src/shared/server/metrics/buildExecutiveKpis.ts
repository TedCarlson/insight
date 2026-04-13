// apps/web/src/shared/domain/metrics/buildExecutiveKpis.ts

import { normalizeBandKey } from "@/shared/bands";

export type ScoreRow = {
  metric_key: string;
  numerator?: number | null;
  denominator?: number | null;
  metric_value?: number | null;
  band_key?: string | null;
};

export type KpiDefinition = {
  kpi_key: string;
  label: string;
  direction: "HIGHER_BETTER" | "LOWER_BETTER";
};

export type ExecutiveKpi = {
  kpi_key: string;
  label: string;
  value: number | null;
  value_display: string;
  band_key: string;
};

function format(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(2);
}

function computeRatio(rows: ScoreRow[]): number | null {
  let num = 0;
  let den = 0;

  for (const r of rows) {
    if (typeof r.numerator === "number") num += r.numerator;
    if (typeof r.denominator === "number") den += r.denominator;
  }

  if (den > 0) return (num / den) * 100;
  return null;
}

function collapseBand(rows: ScoreRow[]): string {
  if (!rows.length) return "NO_DATA";

  const priority = ["NO_DATA", "EXCEEDS", "MEETS", "NEEDS_IMPROVEMENT", "MISSES"];

  let worst = "NO_DATA";

  for (const r of rows) {
    const b = normalizeBandKey(r.band_key);
    if (priority.indexOf(b) > priority.indexOf(worst)) {
      worst = b;
    }
  }

  return worst;
}

export function buildExecutiveKpis(args: {
  definitions: KpiDefinition[];
  rows: ScoreRow[];
}): ExecutiveKpi[] {
  const { definitions, rows } = args;

  return definitions.map((def) => {
    const kpiRows = rows.filter((r) => r.metric_key === def.kpi_key);

    const value = computeRatio(kpiRows);
    const band = collapseBand(kpiRows);

    return {
      kpi_key: def.kpi_key,
      label: def.label,
      value,
      value_display: format(value),
      band_key: band,
    };
  });
}