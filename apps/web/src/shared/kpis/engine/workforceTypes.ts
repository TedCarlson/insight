export type BandKey =
  | "EXCEEDS"
  | "MEETS"
  | "NEEDS_IMPROVEMENT"
  | "MISSES"
  | "NO_DATA";

export type WorkforceMetricCell = {
  value: number | null;
};

export type WorkforceRubricRow = {
  kpi_key: string;
  band_key: BandKey;
};

export type WorkforceRow = {
  tech_id?: string | null;
  metrics?: WorkforceMetricCell[];
};
