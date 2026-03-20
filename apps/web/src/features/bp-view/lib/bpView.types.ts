import type { BandKey } from "@/features/metrics/scorecard/lib/scorecard.types";

export type BpRangeKey = "FM" | "3FM" | "12FM";

export type BpViewHeaderData = {
  role_label: string;
  scope_label: string;
  org_label: string;
  org_count: number;
  range_label: BpRangeKey;
  as_of_date: string;
};

export type BpViewKpiItem = {
  kpi_key: string;
  label: string;
  value: number | null;
  value_display: string | null;
  band_key: BandKey;
  band_label: string;
  support: string | null;
};

export type BpViewRosterMetricCell = {
  kpi_key: string;
  label: string;

  value: number | null;
  value_display: string | null;
  band_key: BandKey;

  // future-facing executive cell contract
  delta_value: number | null;
  delta_display: string | null;

  rank_value: number | null;
  rank_display: string | null;

  rank_delta_value: number | null;
  rank_delta_display: string | null;

  score_value: number | null;
  score_weight: number | null;
  score_contribution: number | null;
};

export type BpViewRosterRow = {
  person_id: string;
  tech_id: string;
  full_name: string;
  context: string;

  // range/view-facing rank (official or derived later)
  rank: number | null;

  metrics: BpViewRosterMetricCell[];
  below_target_count: number;
};

export type BpViewRiskItem = {
  title: string;
  value: string;
  note: string;
};

export type BpViewPayload = {
  header: BpViewHeaderData;
  kpi_strip: BpViewKpiItem[];
  risk_strip: BpViewRiskItem[];
  roster_columns: Array<{ kpi_key: string; label: string }>;
  roster_rows: BpViewRosterRow[];
};