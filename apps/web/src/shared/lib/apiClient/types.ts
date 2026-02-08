export type ApiError = {
  message: string;
  code?: string;
  status?: number;
  details?: string | null;
  hint?: string | null;
};

export type UUID = string;
export type IsoDateString = string;

/**
 * These are "deterministic read models":
 * - We strongly type the keys we *actually* use in UI.
 * - We keep an index signature so backend can evolve without breaking the app.
 */

export type PcOrgChoice = {
  pc_org_id?: UUID;
  pc_org_name?: string | null;
  org_name?: string | null;
  name?: string | null;
  [k: string]: any;
};

export type PcOrgAdminMeta = {
  pc_org_id?: UUID;
  mso_name?: string | null;
  division_name?: string | null;
  region_name?: string | null;
  [k: string]: any;
};

export type PermissionDefRow = {
  permission_key: string;
  description?: string | null;
  created_at?: string | null;
  [k: string]: any;
};

export type PcOrgPermissionGrantRow = {
  pc_org_id?: UUID;
  auth_user_id?: UUID;
  permission_key?: string;
  expires_at?: IsoDateString | null;
  notes?: string | null;
  created_at?: IsoDateString | null;
  created_by?: UUID | null;
  [k: string]: any;
};

export type PcOrgEligibilityRow = {
  pc_org_id?: UUID;
  [k: string]: any;
};

export type PersonRow = {
  person_id?: UUID;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [k: string]: any;
};

/** assignment table (public.assignment) */
export type AssignmentRow = {
  assignment_id: UUID;
  person_id: UUID;
  pc_org_id: UUID;
  tech_id?: string | null;
  start_date: string; // date (YYYY-MM-DD)
  end_date?: string | null; // date (YYYY-MM-DD)
  position_title?: string | null;
  active?: boolean | null;

  [k: string]: any;
};

/** person_pc_org table (public.person_pc_org) */
export type PersonPcOrgRow = {
  person_pc_org_id: UUID;
  person_id: UUID;
  pc_org_id: UUID;
  status: string;
  start_date?: string | null; // date (YYYY-MM-DD)
  end_date?: string | null; // date (YYYY-MM-DD)
  active?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;

  [k: string]: any;
};

/** assignment_reporting table (public.assignment_reporting) */
export type AssignmentReportingRow = {
  assignment_reporting_id: UUID;
  child_assignment_id: UUID;
  parent_assignment_id: UUID;
  start_date: string; // date (YYYY-MM-DD)
  end_date?: string | null; // date (YYYY-MM-DD)
  created_at?: string | null;
  created_by?: UUID | null;
  updated_at?: string | null;
  updated_by?: UUID | null;
  [k: string]: any;
};

/** roster_current "thin slice" row (what the table shows + what the modal uses for selection context) */
export type RosterRow = {
  pc_org_id?: UUID;
  pc_org_name?: string | null;

  person_id?: UUID;
  assignment_id?: UUID;

  full_name?: string | null;
  person_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;

  tech_id?: string | null;
  co_name?: string | null;
  co_type?: string | null;

  position_title?: string | null;
  title?: string | null;
  role_title?: string | null;

  start_date?: string | null;
  end_date?: string | null;
  assignment_active?: boolean | null;

  reports_to_assignment_id?: UUID | null;
  reports_to_person_id?: UUID | null;
  reports_to_full_name?: string | null;

  [k: string]: any;
};

/** roster_current_full (rows from public.roster_row_module_v; used to hydrate roster table columns) */
export type RosterCurrentFullRow = {
  assignment_id?: UUID;
  pc_org_id?: UUID;
  pc_org_name?: string | null;

  person_id?: UUID;
  full_name?: string | null;
  emails?: string | null;
  mobile?: string | null;
  fuse_emp_id?: string | null;
  person_notes?: string | null;
  person_nt_login?: string | null;
  person_csg_id?: string | null;
  person_active?: boolean | null;

  tech_id?: string | null;
  position_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  assignment_active?: boolean | null;

  reports_to_full_name?: string | null;

  co_name?: string | null;
  co_type?: string | null;
  co_code?: string | null;
  co_ref_id?: UUID | null;

  [k: string]: any;
};

/** roster_master "full row model" (richer export shape) */
export type RosterMasterRow = {
  pc_org_id?: UUID;
  pc_org_name?: string | null;
  person_id?: UUID;
  assignment_id?: UUID;

  position_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  active?: boolean | null;
  assignment_active?: boolean | null;

  reports_to_assignment_id?: UUID | null;
  reports_to_person_id?: UUID | null;
  reports_to_full_name?: string | null;

  [k: string]: any;
};

/** roster_drilldown history-capable shape (current + ended) */
export type RosterDrilldownRow = {
  pc_org_id?: UUID;
  pc_org_name?: string | null;
  person_id?: UUID;
  assignment_id?: UUID;

  position_title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  active?: boolean | null;
  assignment_active?: boolean | null;

  reports_to_assignment_id?: UUID | null;
  reports_to_person_id?: UUID | null;
  reports_to_full_name?: string | null;

  [k: string]: any;
};

/** roster_row_module_get (single-call hydration row for the modal: person + assignment + org + leadership) */
export type RosterRowModuleRow = {
  assignment_id?: UUID;
  pc_org_id?: UUID;
  person_id?: UUID;

  // person
  full_name?: string | null;
  emails?: string | null;
  mobile?: string | null;
  fuse_emp_id?: string | null;
  person_notes?: string | null;
  person_nt_login?: string | null;
  person_csg_id?: string | null;
  person_active?: boolean | null;

  // company/contractor
  co_type?: string | null;
  co_code?: string | null;
  co_ref_id?: UUID | null;
  co_name?: string | null;

  // assignment
  tech_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  position_title?: string | null;
  assignment_record_active?: boolean | null;
  assignment_active?: boolean | null;

  // org
  pc_org_name?: string | null;
  pc_id?: UUID | null;
  pc_number?: number | null;
  mso_id?: UUID | null;
  mso_name?: string | null;
  division_id?: UUID | null;
  division_name?: string | null;
  division_code?: string | null;
  region_id?: UUID | null;
  region_name?: string | null;
  region_code?: string | null;

  // leadership
  reports_to_assignment_id?: UUID | null;
  reports_to_person_id?: UUID | null;
  reports_to_full_name?: string | null;

  direct_reports?: any[] | null;

  reports_to_reporting_id?: UUID | null;
  reports_to_child_assignment_id?: UUID | null;
  reports_to_start_date?: string | null;
  reports_to_end_date?: string | null;
  reports_to_created_at?: string | null;
  reports_to_created_by?: string | null;
  reports_to_updated_at?: string | null;
  reports_to_updated_by?: string | null;

  [k: string]: any;
};

export type OrgEventRow = {
  org_event_id?: UUID;
  id?: UUID;
  pc_org_id?: UUID;

  created_at?: string | null;
  occurred_at?: string | null;
  at?: string | null;

  summary?: string | null;
  message?: string | null;
  event_label?: string | null;
  event_key?: string | null;
  type?: string | null;

  payload?: any;
  [k: string]: any;
};

export type PersonUpsertInput = {
  person_id?: UUID;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  phone?: string | null;

  /** Additional editable identifiers */
  fuse_emp_id?: string | null;
  person_csg_id?: string | null;
  person_nt_login?: string | null;

  /** Free-form notes */
  person_notes?: string | null;

  status?: string | null;

  /** Allow backend to ignore/accept extra keys as it evolves */
  [k: string]: any;
};
