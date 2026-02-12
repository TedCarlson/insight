// apps/web/src/features/metrics-reports/lib/score.ts

export type Direction = "HIGHER_BETTER" | "LOWER_BETTER";

export type BandKey = "EXCEEDS" | "MEETS" | "NEEDS_IMPROVEMENT" | "MISSES" | "NO_DATA";

export type RubricRow = {
  class_type: "P4P" | "SMART" | "TECH";
  kpi_key: string;
  band_key: BandKey;
  min_value: number | null;
  max_value: number | null;
  score_value: number | null;
};

export type ClassKpiConfigRow = {
  class_type: "P4P" | "SMART" | "TECH";
  kpi_key: string;
  enabled: boolean | null;
  weight_percent: number | null;
  threshold: number | null;
  grade_value: number | null; // IMPORTANT: decimals allowed
};

export type KpiDefRow = {
  kpi_key: string;
  direction: Direction | null;
};

export type ScoreResult = {
  band_key: BandKey;
  score_value: number; // 0 if NO_DATA or missing score in rubric
};

/**
 * Pick the rubric band for a raw metric value.
 * - If metricValue is null/undefined/NaN => NO_DATA
 * - Otherwise selects the first band whose [min,max] contains metricValue (inclusive).
 * - If multiple match, prioritizes the "stronger" band ordering.
 */
export function pickBand(args: {
  metricValue: number | null | undefined;
  rubricRows: RubricRow[];
}): BandKey {
  const v = args.metricValue;
  if (v == null || !Number.isFinite(v)) return "NO_DATA";

  const rows = (args.rubricRows ?? []).filter((r) => r.band_key !== "NO_DATA");

  // Prefer a stable priority so overlaps don't cause random results
  const priority: BandKey[] = ["EXCEEDS", "MEETS", "NEEDS_IMPROVEMENT", "MISSES", "NO_DATA"];
  const sorted = rows.slice().sort((a, b) => priority.indexOf(a.band_key) - priority.indexOf(b.band_key));

  for (const r of sorted) {
    const minOk = r.min_value == null ? true : v >= r.min_value;
    const maxOk = r.max_value == null ? true : v <= r.max_value;
    if (minOk && maxOk) return r.band_key;
  }

  // If no explicit band matches, fall back:
  // - This can happen when rubric isn't filled yet.
  return "NO_DATA";
}

/**
 * Convert a band to a score value using the rubric row's score_value.
 * If missing, returns 0.
 */
export function bandToScore(args: {
  bandKey: BandKey;
  rubricRows: RubricRow[];
}): number {
  if (args.bandKey === "NO_DATA") return 0;

  const r = (args.rubricRows ?? []).find((x) => x.band_key === args.bandKey);
  const s = r?.score_value;
  return Number.isFinite(Number(s)) ? Number(s) : 0;
}

/**
 * Score a single KPI for a given class.
 * You pass the rubric rows already filtered to (class_type + kpi_key).
 */
export function scoreKpi(args: {
  metricValue: number | null | undefined;
  rubricRowsForKpi: RubricRow[];
}): ScoreResult {
  const band_key = pickBand({
    metricValue: args.metricValue,
    rubricRows: args.rubricRowsForKpi,
  });

  const score_value = bandToScore({
    bandKey: band_key,
    rubricRows: args.rubricRowsForKpi,
  });

  return { band_key, score_value };
}

/**
 * Weighted rollup (simple):
 * - Uses weight_percent if provided; if missing, treats as 0.
 * - Uses the rubric score_value already computed (typically aligned to grade_value).
 * Returns a total score (not normalized).
 */
export function rollupWeighted(args: {
  scored: Array<{
    kpi_key: string;
    score_value: number;
    weight_percent: number | null;
    enabled: boolean | null;
  }>;
}): number {
  let total = 0;

  for (const row of args.scored ?? []) {
    if (!row.enabled) continue;

    const w = Number(row.weight_percent ?? 0);
    if (!Number.isFinite(w) || w <= 0) continue;

    const s = Number(row.score_value ?? 0);
    if (!Number.isFinite(s)) continue;

    total += s * (w / 100);
  }

  return total;
}