// apps/web/src/features/metrics-admin/lib/rubric.ts

export const RUBRIC_BANDS = [
  "EXCEEDS",
  "MEETS",
  "NEEDS_IMPROVEMENT",
  "MISSES",
  "NO_DATA",
] as const;

export type RubricBandKey = (typeof RUBRIC_BANDS)[number];

export type RubricRow = {
  mso_id?: string | null;
  class_type: string;
  kpi_key: string;
  band_key: RubricBandKey;
  min_value: number | null;
  max_value: number | null;
  score_value: number | null;
};

export function createEmptyRubricRows(
  classType: string,
  kpiKey: string,
  mso_id?: string | null
): RubricRow[] {
  return RUBRIC_BANDS.map((band) => ({
    mso_id: mso_id ?? null,
    class_type: classType,
    kpi_key: kpiKey,
    band_key: band,
    min_value: null,
    max_value: null,
    score_value: null,
  }));
}