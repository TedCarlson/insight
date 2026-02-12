// apps/web/src/features/metrics-admin/lib/types.ts

export type MetricsDirection = "HIGHER_BETTER" | "LOWER_BETTER";

export type MetricsKpiDef = {
  kpi_key: string;
  label: string;
  customer_label: string | null;
  raw_label_identifier: string | null;
  raw_inputs: any | null;
  direction: MetricsDirection;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type MetricsClassType = "P4P" | "SMART" | "TECH";

export type MetricsClassKpiConfigRow = {
  class_type: MetricsClassType | string;
  kpi_key: string;

  enabled: boolean;
  weight: number;
  threshold: number | null;
  stretch_goal: number | null;

  // Future-proofing: rubric band ranges/scores can be added later without breaking UI.
  [k: string]: any;
};

// --------------------------
// API payloads / responses
// --------------------------

export type UpsertClassConfigRequest = {
  action: "upsert_class_config";
  classType: MetricsClassType;
  rows: Array<{
    kpi_key: string;
    enabled: boolean;
    weight: number;
    threshold: number | null;
    stretch_goal: number | null;
  }>;
};

export type UpdateKpiLabelsRequest = {
  action: "update_kpi_labels";
  kpi_key: string;
  label?: string | null;
  customer_label?: string | null;
};

export type MetricsConfigGetResponse = {
  kpiDefs: MetricsKpiDef[];
  classConfig: MetricsClassKpiConfigRow[];
};

export type UpsertClassConfigResponse = {
  classType: string;
  rows: MetricsClassKpiConfigRow[];
};

export type UpdateKpiLabelsResponse = {
  kpiDef: MetricsKpiDef | null;
};