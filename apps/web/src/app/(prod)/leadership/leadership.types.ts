import type { AssignmentRow } from '../assignment/assignment.types'

/** public.assignment_leadership_admin_v */
export type LeadershipRow = {
    assignment_reporting_id: string | null
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

export type LeadershipEdge = LeadershipRow & {
    child?: AssignmentRow | null
    parent?: AssignmentRow | null
}
