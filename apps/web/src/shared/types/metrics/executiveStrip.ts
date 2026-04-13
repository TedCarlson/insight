// path: apps/web/src/types/metrics/executiveStrip.ts

export type MetricsExecutiveComparisonState =
  | "better"
  | "worse"
  | "neutral";

export type MetricsExecutiveKpiItem = {
  kpi_key: string;
  label: string;
  value_display: string;
  band_key: string;
  band_label: string;
  support?: string | null;
  comparison_scope_code: string;
  comparison_value_display: string;
  variance_display: string | null;
  comparison_state: MetricsExecutiveComparisonState;
};