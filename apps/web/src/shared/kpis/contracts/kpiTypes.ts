export type KpiKey = string;

export type KpiFamily =
  | "tnps"
  | "ratio"
  | "sum"
  | "direct_value"
  | "unknown";

export type KpiAggregationMode =
  | "aggregate_tnps"
  | "aggregate_ratio"
  | "aggregate_sum"
  | "direct_total_row"
  | "direct_atomic_row"
  | "unknown";

export type KpiSourcePolicy =
  | "prefer_totals"
  | "atomic_only"
  | "totals_only"
  | "prefer_atomic";

export type BandKey =
  | "EXCEEDS"
  | "MEETS"
  | "NEEDS_IMPROVEMENT"
  | "MISSES"
  | "NO_DATA";

export type KpiDefinitionLike = {
  kpi_key: string;
  label?: string | null;
  customer_label?: string | null;
  raw_label_identifier?: string | null;
};

export type KpiValueResult = {
  kpi_key: KpiKey;
  value: number | null;
  band_key: BandKey | null;
};

export type RawMetricPayload = Record<string, unknown>;

export type RatioComponents = {
  numerator: number;
  denominator: number;
};

export type TnpsComponents = {
  surveys: number;
  promoters: number;
  detractors: number;
};

export type KpiCandidateKeys = {
  value_keys: string[];
  numerator_keys?: string[];
  denominator_keys?: string[];
};

export type SupportedToplineKpiKey =
  | "tnps"
  | "ftr"
  | "tool_usage"
  | "met_rate"
  | "pht_pure_pass"
  | "contact_48hr_rate"
  | "repeat_rate"
  | "rework_rate"
  | "soi_rate";

export type SupportedFactKey =
  | "installs"
  | "tcs"
  | "sros"
  | "total_jobs"
  | "total_appts"
  | "total_met_appts"
  | "tnps_surveys"
  | "promoters"
  | "detractors"
  | "ftr_fail_jobs"
  | "total_ftr_contact_jobs"
  | "tu_result"
  | "tu_eligible_jobs"
  | "pht_jobs"
  | "pht_pure_pass"
  | "pht_rtm"
  | "pht_fails"
  | "contact_48hr_orders"
  | "repeat_count"
  | "rework_count"
  | "soi_count";

export type KpiSurfaceKind =
  | "kpi_strip"
  | "supervisor_pulse"
  | "parity"
  | "workforce_table"
  | "risk_strip"
  | "scorecard";