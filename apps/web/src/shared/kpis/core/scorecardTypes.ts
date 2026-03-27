import type { KpiBandKey, KpiBandPaint } from "@/shared/kpis/core/types";

export type ScorecardMomentumState = string;

export type ScorecardMomentumArrow =
  | "up"
  | "down"
  | "flat"
  | null;

export type ScorecardMomentum = {
  state: ScorecardMomentumState;
  delta: number | null;
  delta_display: string | null;
  arrow: ScorecardMomentumArrow;
  windows: {
    short_days: number;
    long_days: number;
  };
  notes: string | null;
};

export type ScorecardContext = {
  sample_short: number | null;
  sample_long: number | null;
  meets_min_volume: boolean | null;
  [key: string]: unknown;
} | null;

export type ScorecardBand = {
  band_key: KpiBandKey;
  label: string;
  paint: KpiBandPaint;
};

export type ScorecardTile = {
  kpi_key: string;
  label: string;
  value: number | null;
  value_display: string | null;
  band: ScorecardBand;
  momentum: ScorecardMomentum;
  context: ScorecardContext;
  drill?: {
    trend_ranges: number[];
    default_range: number;
  };
  [key: string]: unknown;
};

export type ScorecardHeader = {
  person_id?: string;
  full_name: string | null;
  affiliation: string | null;
  supervisor_name?: string | null;
  tech_id: string | null;
  pc_org_name?: string | null;
  fiscal_month_key: string;
  fiscal_start_date?: string;
  fiscal_end_date?: string;
  [key: string]: unknown;
};

export type ScorecardOrgOption = {
  pc_org_id: string;
  label: string;
  tech_id: string | null;
  is_selected: boolean;
};

export type ScorecardResponse = {
  header: ScorecardHeader;
  org_selector?: ScorecardOrgOption[];
  tiles: ScorecardTile[];
  rank?: number | null;
  [key: string]: unknown;
};