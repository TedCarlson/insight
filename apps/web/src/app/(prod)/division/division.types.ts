// apps/web/src/app/(prod)/division/division.types.ts

export type DivisionInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.division_admin_v
 * Columns: division_id, division_name, division_code
 */
export type DivisionRow = {
  division_id: string
  division_name: string
  division_code: string
}

/**
 * WRITE shape (base): public.division
 * Required: division_id, division_name, division_code
 */
export type CreateDivisionInput = {
  division_id?: string
  division_name: string
  division_code: string
}

/**
 * Editable fields (base)
 */
export type EditableField = 'division_name' | 'division_code'
