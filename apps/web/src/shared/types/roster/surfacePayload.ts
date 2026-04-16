// path: apps/web/src/shared/types/roster/surfacePayload.ts

export type RosterRoleType =
  | "TECH"
  | "SUPERVISOR"
  | "MANAGER"
  | "DIRECTOR"
  | "OWNER"
  | "LEAD"
  | "OTHER";

export type RosterGroupKey = "FIELD" | "LEADERSHIP" | "INCOMPLETE";
export type RosterStatusFilter = "ACTIVE" | "INACTIVE" | "ALL";

export type RosterHeader = {
  pc_org_id: string;
  org_name: string | null;
  as_of_date: string;
  total_people: number;
  total_active_seats: number;
};

export type RosterFilters = {
  status: RosterStatusFilter;
  seat_types: {
    field: boolean;
    leadership: boolean;
    incomplete: boolean;
  };
  search: string;
  position_titles: string[];
  reports_to_person_id: string | null;
};

export type RosterSeatRow = {
  seat_id: string;
  person_id: string;
  full_name: string;
  pc_org_id: string;

  position_title: string;
  role_type: RosterRoleType;

  is_field: boolean;
  is_leadership: boolean;
  allows_tech: boolean;

  tech_id: string | null;

  reports_to_person_id: string | null;
  reports_to_name: string | null;

  effective_start_date: string;
  effective_end_date: string | null;
  active_flag: boolean;

  is_incomplete: boolean;

  display: {
    subtitle: string | null;
    badges: string[];
  };
};

export type RosterGroup = {
  key: RosterGroupKey;
  label: string;
  count: number;
  rows: RosterSeatRow[];
};

export type RosterPerson = {
  person_id: string;
  full_name: string;
  status: "active" | "inactive" | "archived";
  active_seat_count: number;
  has_field_seat: boolean;
  has_leadership_seat: boolean;
};

export type RosterSeatHistoryRow = {
  seat_id: string;
  position_title: string;
  tech_id: string | null;
  reports_to_person_id: string | null;
  reports_to_name: string | null;
  effective_start_date: string;
  effective_end_date: string | null;
  active_flag: boolean;
};

export type RosterSurfacePayload = {
  header: RosterHeader;
  filters: RosterFilters;
  groups: RosterGroup[];
  selected?: {
    seat: RosterSeatRow;
    person: RosterPerson;
    history: RosterSeatHistoryRow[];
  };
  signals: {
    incomplete_count: number;
    active_seat_count: number;
    field_seat_count: number;
    leadership_seat_count: number;
  };
};