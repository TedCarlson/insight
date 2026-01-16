// apps/web/src/app/(prod)/assignment/assignment.types.ts

/** Authoritative read shape from public.assignment_admin_v */
export type AssignmentRow = {
  assignment_id: string | null
  person_id: string | null
  pc_org_id: string | null

  tech_id: string | null
  start_date: string | null
  end_date: string | null

  position_title: string | null

  /** Derived display fields from views */
  full_name: string | null
  pc_org_name: string | null
}


export type CreateAssignmentInput = {
  person_id: string | null
  pc_org_id: string | null
  tech_id?: string | null
  position_title?: string | null
  start_date?: string | null
  end_date?: string | null
}

export type UpdateAssignmentInput = Partial<CreateAssignmentInput>
export type PositionTitleOption = { id: string; label: string }
export type AssignmentInspectorMode = 'create' | 'edit'

/** Authoritative read shape from public.assignment_reporting_admin_v */
export type AssignmentReportingRow = {
  assignment_leadership_id: string | null
  child_assignment_id: string | null
  parent_assignment_id: string | null
  start_date: string | null
  end_date: string | null
  created_at: string | null
  created_by: string | null
  updated_at: string | null
  updated_by: string | null
  active: boolean | null
}

export type AssignmentReportingEdge = AssignmentReportingRow & {
  child?: AssignmentRow | null
  parent?: AssignmentRow | null
}
