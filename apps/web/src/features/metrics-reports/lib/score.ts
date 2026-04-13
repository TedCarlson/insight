// apps/web/src/features/metrics-reports/lib/score.ts

export type BandKey =
  | "EXCEEDS"
  | "MEETS"
  | "NEEDS_IMPROVEMENT"
  | "MISSES"
  | "NO_DATA";

export type RubricRow = {
  kpi_key: string;
  band_key: BandKey;
  min_value: number | null;
  max_value: number | null;
};

/**
 * Resolves a numeric value into a band using rubric rows.
 * This is TEMP bridge until we fully move to shared/bands + rubric engine.
 */
export function pickBand(args: {
  value: number | null;
  rubricRows: RubricRow[];
}): BandKey {
  const { value, rubricRows } = args;

  if (value == null || !Number.isFinite(value)) return "NO_DATA";

  for (const row of rubricRows ?? []) {
    const minOk =
      row.min_value == null || value >= row.min_value;
    const maxOk =
      row.max_value == null || value <= row.max_value;

    if (minOk && maxOk) {
      return row.band_key;
    }
  }

  return "NO_DATA";
}