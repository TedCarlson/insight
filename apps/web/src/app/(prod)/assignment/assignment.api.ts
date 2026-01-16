// apps/web/src/app/(prod)/assignment/assignment.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type {
  AssignmentRow,
  AssignmentReportingEdge,
  AssignmentReportingRow,
  CreateAssignmentInput,
  UpdateAssignmentInput,
  PositionTitleOption,
} from './assignment.types'

const supabase = createClient()

/* ------------------------------------------------------------------ */
/* READ (ADMIN LEDGER)                                                 */
/* ------------------------------------------------------------------ */

/**
 * Fetch all assignments (admin)
 *
 * Authoritative read:
 * - assignment_admin_v
 */
export async function fetchAssignments(): Promise<AssignmentRow[]> {
  const { data, error } = await supabase
    .from('assignment_admin_v')
    .select('*')
    .order('full_name', { ascending: true, nullsFirst: false })
    .order('start_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('fetchAssignments error', error)
    throw error
  }

  return (data ?? []) as AssignmentRow[]
}

/**
 * Fetch assignments by id (admin view)
 * Useful for enriching reporting edges.
 */
export async function fetchAssignmentsByIds(
  assignmentIds: string[]
): Promise<AssignmentRow[]> {
  const ids = Array.from(new Set((assignmentIds ?? []).filter(Boolean)))
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('assignment_admin_v')
    .select('*')
    .in('assignment_id', ids)

  if (error) {
    console.error('fetchAssignmentsByIds error', error)
    throw error
  }

  return (data ?? []) as AssignmentRow[]
}

/* ------------------------------------------------------------------ */
/* UPDATE FLOW (Inspector edit mode)                                   */
/* ------------------------------------------------------------------ */

/**
 * Update assignment core fields
 *
 * Writes:
 * - base table: assignment
 *
 * Reads:
 * - admin view: assignment_admin_v (authoritative)
 */
export async function updateAssignmentCore(
  assignmentId: string,
  payload: UpdateAssignmentInput
): Promise<AssignmentRow> {
  const { error } = await supabase
    .from('assignment')
    .update(payload)
    .eq('assignment_id', assignmentId)

  if (error) {
    console.error('updateAssignmentCore error', error)
    throw error
  }

  const { data, error: readError } = await supabase
    .from('assignment_admin_v')
    .select('*')
    .eq('assignment_id', assignmentId)
    .single()

  if (readError) {
    console.error('post-update fetch error', readError)
    throw readError
  }

  return data as AssignmentRow
}

/* ------------------------------------------------------------------ */
/* CREATE FLOW (Inspector only)                                        */
/* ------------------------------------------------------------------ */

/**
 * Create a new assignment (Inspector create mode)
 *
 * Rules:
 * - Insert → rehydrate from admin view
 */
export async function createAssignment(
  payload: CreateAssignmentInput
): Promise<AssignmentRow> {
  const { data: inserted, error: insertError } = await supabase
    .from('assignment')
    .insert(payload)
    .select('assignment_id')
    .single()

  if (insertError) {
    console.error('createAssignment insert error', insertError)
    throw insertError
  }

  const { data: row, error: readError } = await supabase
    .from('assignment_admin_v')
    .select('*')
    .eq('assignment_id', inserted.assignment_id)
    .single()

  if (readError) {
    console.error('createAssignment post-read error', readError)
    throw readError
  }

  return row as AssignmentRow
}

/* ------------------------------------------------------------------ */
/* REPORTING (READ ONLY, v1)                                           */
/* ------------------------------------------------------------------ */

export async function fetchAssignmentReportingEdges(
  assignmentId: string
): Promise<AssignmentReportingEdge[]> {
  const { data, error } = await supabase
    .from('assignment_leadership_admin_v') // ✅ correct renamed view
    .select('*')
    .or(
      `child_assignment_id.eq.${assignmentId},parent_assignment_id.eq.${assignmentId}`
    )
    .order('start_date', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('fetchAssignmentReportingEdges error', error)
    throw error
  }

  const rows = (data ?? []) as AssignmentReportingRow[]
  const otherIds: string[] = []
  for (const r of rows) {
    if (r.child_assignment_id) otherIds.push(r.child_assignment_id)
    if (r.parent_assignment_id) otherIds.push(r.parent_assignment_id)
  }

  const assignments = await fetchAssignmentsByIds(otherIds)
  const map = new Map<string, AssignmentRow>()
  for (const a of assignments) {
    if (a.assignment_id) map.set(a.assignment_id, a)
  }

  return rows.map((r) => ({
    ...r,
    child: r.child_assignment_id ? map.get(r.child_assignment_id) ?? null : null,
    parent: r.parent_assignment_id
      ? map.get(r.parent_assignment_id) ?? null
      : null,
  }))
}
/* ------------------------------------------------------------------ */
/* POSITION TITLES (READ ONLY, canonical list)                         */
/* ------------------------------------------------------------------ */

/**
 * Fetch position titles for standardized dropdown (admin)
 *
 * Authoritative read:
 * - position_title_admin_v
 *
 * Returns:
 * - { id, label } for UI dropdowns
 */
export async function fetchPositionTitles(): Promise<PositionTitleOption[]> {
  const { data, error } = await supabase
    .from('position_title_admin_v')
    .select('position_title_id, position_title, sort_order')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('position_title', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('fetchPositionTitles error', error)
    throw error
  }

  return (
    (data ?? []).map((r: any) => ({
      id: r.position_title_id,
      label: r.position_title,
    })) as PositionTitleOption[]
  )
}
