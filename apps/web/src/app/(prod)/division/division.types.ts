// apps/web/src/app/(prod)/division/division.types.ts

export type DivisionInspectorMode = 'create' | 'edit'

export type DivisionRow = {
  division_id?: string | null
  id?: string | null

  division_name?: string | null
  name?: string | null

  division_code?: string | null
  code?: string | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreateDivisionInput = {
  name: string
  code?: string | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'active'
