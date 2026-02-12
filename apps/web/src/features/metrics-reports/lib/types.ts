// apps/web/src/features/metrics-reports/lib/types.ts

export type ClassType = "P4P" | "SMART" | "TECH";
export type Direction = "HIGHER_BETTER" | "LOWER_BETTER";

export type BandKey =
  | "EXCEEDS"
  | "MEETS"
  | "MISSES"
  | "NEEDS_IMPROVEMENT"
  | "NO_DATA";

export const BAND_KEYS: BandKey[] = [
  "EXCEEDS",
  "MEETS",
  "MISSES",
  "NEEDS_IMPROVEMENT",
  "NO_DATA",
];

export type KpiDefRow = {
  kpi_key: string;
  label?: string | null;
  customer_label?: string | null;
  direction?: Direction | null;
  unit?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  // allow extra DB columns
  [k: string]: any;
};

export type ClassKpiConfigRow = {
  class_type: ClassType;
  kpi_key: string;
  enabled?: boolean | null;
  weight_percent?: number | null;
  threshold?: number | null;
  grade_value?: number | null;
  [k: string]: any;
};

export type RubricRow = {
  class_type: ClassType;
  kpi_key: string;
  band_key: BandKey;
  min_value?: number | null;
  max_value?: number | null;
  score_value?: number | null;
  [k: string]: any;
};

/**
 * Raw observed KPI value for a person/tech/time slice.
 * We'll keep this intentionally loose; you can map ONTRAC/QC/BVT later.
 */
export type RawMetricRow = {
  person_id?: string | null;
  tech_id?: string | null;
  kpi_key: string;
  value: number | null;

  // optional dims
  fiscal_month?: string | null;
  source_type?: string | null;

  // label helpers
  person_label?: string | null;

  [k: string]: any;
};

export type ConfigSnapshot = {
  kpiDefs: KpiDefRow[];
  classConfig: ClassKpiConfigRow[];
  rubricRows: RubricRow[];
};

export type ReportPreviewPayload = {
  snapshot: ConfigSnapshot;
  rawRows: RawMetricRow[];
};

/** Computed result per KPI per class for a single entity (tech/person). */
export type ComputedKpiResult = {
  class_type: ClassType;
  kpi_key: string;

  value: number | null;

  band_key: BandKey;

  // rubric row used (if any)
  rubric_min: number | null;
  rubric_max: number | null;
  rubric_score: number | null;

  // config used
  threshold: number | null;
  grade_value: number | null;
  weight_percent: number | null;

  // computed
  weighted_points: number | null; // (rubric_score * weight%) or similar; see score.ts
};

export type ComputedEntityRow = {
  entity_key: string; // person_id or tech_id
  entity_label: string;

  results: ComputedKpiResult[];

  totalsByClass: Record<ClassType, { points: number; maxPoints: number }>;
};