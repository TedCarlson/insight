// apps/web/src/app/(prod)/mso/mso.types.ts

export type MsoInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.mso_admin_v
 * Columns: mso_id, mso_name
 */
export type MsoRow = {
  mso_id: string
  mso_name: string
}

/**
 * WRITE shape (base): public.mso
 * Required: mso_id, mso_name
 */
export type CreateMsoInput = {
  mso_id?: string
  mso_name: string
}

export type EditableField = 'mso_name'
