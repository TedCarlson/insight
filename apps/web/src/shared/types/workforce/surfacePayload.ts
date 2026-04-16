import type { WorkforceRow, WorkforceSeatType } from "./workforce.types";

export type WorkforceTab = {
  key: WorkforceSeatType | "ALL";
  label: string;
  count: number;
};

export type WorkforceSelectedPerson = {
  person_id: string;
  display_name: string;
  active_seat_count: number;
  has_field_seat: boolean;
  has_leadership_seat: boolean;
  has_travel_seat: boolean;
};

export type WorkforceSeatHistoryRow = {
  person_id: string;
  tech_id: string | null;
  position_title: string | null;
  reports_to_name: string | null;
  office: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  seat_type: WorkforceSeatType;
  is_travel_tech: boolean;
};

export type WorkforceSurfacePayload = {
  rows: WorkforceRow[];

  tabs: WorkforceTab[];

  summary: {
    total: number;
    field: number;
    leadership: number;
    incomplete: number;
    travel: number;
  };

  selected?: {
    row: WorkforceRow;
    person: WorkforceSelectedPerson;
    history: WorkforceSeatHistoryRow[];
  };
};