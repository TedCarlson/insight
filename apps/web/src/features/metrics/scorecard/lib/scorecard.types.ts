export type BandKey = "EXCEEDS" | "MEETS" | "NEEDS_IMPROVEMENT" | "MISSES" | "NO_DATA";

export type MomentumState = "UP" | "FLAT" | "DOWN" | "AT_RISK" | "NO_DATA";

export type MomentumArrow = "UP" | "FLAT" | "DOWN";

export type ValueFormat = "PERCENT" | "NUMBER" | "INTEGER" | "RATIO" | "CURRENCY";

export type ScorecardHeader = {
  person_id: string;
  full_name: string | null;
  affiliation: string | null;
  supervisor_name: string | null;
  tech_id: string | null;

  pc_org_name: string | null;

  fiscal_month_key: string;
  fiscal_start_date: string;
  fiscal_end_date: string;
};

export type ScorecardOrgOption = {
  pc_org_id: string;
  label: string;
  tech_id: string | null;
  is_selected: boolean;
};

export type ScorecardTile = {
  kpi_key: string;
  label: string;
  short_label?: string | null;

  value: number | null;
  value_display: string | null;

  format?: {
    value_format: ValueFormat;
    decimals: number;
    multiplier: number;
    unit_suffix: string | null;
  };

  band: {
    band_key: BandKey;
    label: string;
    paint: {
      preset: string;
      bg: string | null;
      border: string | null;
      ink: string | null;
    };
  };

  momentum: {
    state: MomentumState;
    delta: number | null;
    delta_display: string | null;
    arrow: MomentumArrow | null;
    windows: { short_days: number; long_days: number };
    notes: string | null;
  };

  context: {
    sample_short: number | null;
    sample_long: number | null;
    meets_min_volume: boolean | null;
  } | null;

  drill?: {
    trend_ranges: Array<30 | 60 | 90>;
    default_range: 30 | 60 | 90;
  };
};

export type ScorecardResponse = {
  header: ScorecardHeader;
  org_selector: ScorecardOrgOption[];
  tiles: ScorecardTile[];
  rank?: null;
};