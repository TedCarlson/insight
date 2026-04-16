export type WorkforceSeatType =
  | "FIELD"
  | "LEADERSHIP"
  | "INCOMPLETE"
  | "TRAVEL";

export type WorkforceScheduleDay = {
  day: "U" | "M" | "T" | "W" | "H" | "F" | "S";
  state: "WORKING" | "OFF" | "UNKNOWN";
};

export type WorkforceRow = {
  // identity
  person_id: string;
  tech_id: string | null;

  first_name: string | null;
  preferred_name: string | null;
  last_name: string | null;
  display_name: string;

  // default view
  office: string | null;
  reports_to_name: string | null;
  schedule: WorkforceScheduleDay[];

  // classification
  seat_type: WorkforceSeatType;

  // operational detail
  mobile: string | null;
  nt_login: string | null;
  csg: string | null;

  position_title: string | null;
  affiliation: string | null;

  start_date: string | null;
  end_date: string | null;

  // flags
  is_active: boolean;
  is_travel_tech: boolean;
  is_incomplete: boolean;
};