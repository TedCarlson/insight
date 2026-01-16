///apps/web/src/app/(prod)/assignment/assignment.types.ts

export type AssignmentRow = {
    assignment_id: string

    assignment_name: string
    role: string | null

    person_id: string
    person_full_name: string

    company_name: string | null

    active: boolean
    start_date: string | null
    end_date: string | null

    // current reporting (derived from view)
    reports_to_person_id: string | null
    reports_to_full_name: string | null
}

export type CreateAssignmentInput = {
    assignment_name: string
    person_id: string
    role?: string | null
    active?: boolean
    start_date?: string | null
    end_date?: string | null
}

export type UpdateAssignmentInput = Partial<CreateAssignmentInput>

export type AssignmentInspectorMode = 'create' | 'edit'
