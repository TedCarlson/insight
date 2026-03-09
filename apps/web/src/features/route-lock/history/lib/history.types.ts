export type TechSearchItem = {
  assignment_id: string;
  person_id: string;
  tech_id: string;
  full_name: string;
  co_name: string | null;
};

export type HistoryEvent = {
  effective_date: string;
  event_type: "INITIAL_ASSIGNMENT" | "ROUTE_CHANGE" | "BASELINE_DAYS_CHANGE" | string;
  from_value?: string | number | null;
  to_value?: string | number | null;
  from_day_set?: string | null;
  to_day_set?: string | null;
};

export type HistoryDetailRow = {
  shift_date: string;
  weekday_key: string;
  weekday_label: string;
  is_baseline_day: boolean;
  route_id: string | null;
  route_name: string | null;
};

export type HistorySegment = {
  segment_id: string;
  from_date: string;
  to_date: string;
  route_id: string | null;
  route_name: string | null;
  baseline_days_count: number;
  baseline_day_set: string[];
  baseline_day_set_label: string;
  span_days: number;
  detail_rows: HistoryDetailRow[];
};

export type HistoryResponse = {
  ok: true;
  tech: {
    assignment_id: string;
    tech_id: string;
    full_name: string;
    co_name: string | null;
  };
  window: {
    from: string;
    to: string;
  };
  events: HistoryEvent[];
  segments: HistorySegment[];
};

export type CheckInWeeklyRow = {
  week_start: string;
  week_end: string;
  tech_id: string;
  full_name: string;
  affiliation: string | null;
  days_worked: number;
  worked_dates: string[];
  worked_dates_label: string;
  actual_jobs: number;
  actual_units: number;
  actual_hours: number;
};

export type CheckInWeeklyResponse = {
  ok: true;
  tech: {
    assignment_id: string;
    tech_id: string;
    full_name: string;
    affiliation: string | null;
  };
  window: {
    from: string;
    to: string;
  };
  rows: CheckInWeeklyRow[];
};