// apps/web/src/app/(prod)/mso/mso.types.ts

export type MsoInspectorMode = 'create' | 'edit'

export type MsoRow = {
  mso_id?: string | null
  id?: string | null

  mso_name?: string | null
  name?: string | null

  mso_code?: string | null
  code?: string | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreateMsoInput = {
  name: string
  code?: string | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'active'
