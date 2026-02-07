export type Frame = "AM" | "PM";

export type StateResource = {
  state_code: string;
  state_name: string;
  default_manpower: number;
  backlog_seed: number;
  is_active?: boolean;
};

export type TicketInputs = {
  manpower_count: number | "";
  tickets_received_am: number | "";
  tickets_closed_pm: number | "";
  project_tickets: number | "";
  emergency_tickets: number | "";
};

export type GridRow = {
  state_name: string;
  state_code: string;
  inputs: TicketInputs;
};

export type DailyRowFromApi = {
  log_date: string; // YYYY-MM-DD
  state_code: string;
  state_name: string;

  manpower_count: number;
  tickets_received_am: number;
  tickets_closed_pm: number;
  project_tickets: number;
  emergency_tickets: number;

  backlog_start: number;
  backlog_end: number;

  avg_received_per_tech: number;
  avg_closed_per_tech: number;

  updated_at?: string;
};