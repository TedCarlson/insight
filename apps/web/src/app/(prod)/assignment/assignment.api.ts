// apps/web/src/app/(prod)/assignment/assignment.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type {
    AssignmentRow,
    CreateAssignmentInput,
    UpdateAssignmentInput,
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
        .order('assignment_name')

    if (error) {
        console.error('fetchAssignments error', error)
        throw error
    }

    return (data ?? []) as AssignmentRow[]
}

/* ------------------------------------------------------------------ */
/* UPDATE                                                             */
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
 * - No duplicate advisory (v1)
 * - Insert → rehydrate from admin view
 */
export async function createAssignment(
    payload: CreateAssignmentInput
): Promise<AssignmentRow> {
    const insertPayload = {
        ...payload,
        active: payload.active ?? true,
    }

    const { data: inserted, error: insertError } = await supabase
        .from('assignment')
        .insert(insertPayload)
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
