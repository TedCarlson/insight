export type KpiBandKey =
  | "EXCEEDS"
  | "MEETS"
  | "NEEDS_IMPROVEMENT"
  | "MISSES"
  | "NO_DATA";

export type MetricsRangeKey = "FM" | "PREVIOUS" | "3FM" | "12FM";

export type RawMetricRow = {
  metric_date: string;
  fiscal_end_date: string;
  batch_id: string;
  inserted_at: string;
  raw: Record<string, unknown>;
};

export type KpiRubricRow = {
  kpi_key: string;
  band_key: KpiBandKey;
  min_value: number | null;
  max_value: number | null;
  score_value?: number | null;
};

export type KpiBandPaint = {
  preset: string | null;
  bg: string | null;
  border: string | null;
  ink: string | null;
};

export type KpiPresentationInput = {
  kpiKey: string;
  value: number | null;
  rubric?: KpiRubricRow[];
};

export type KpiPresentationOutput = {
  label: string;
  value: number | null;
  value_display: string | null;
  band_key: KpiBandKey;
  band_label: string;
  paint: KpiBandPaint;
};