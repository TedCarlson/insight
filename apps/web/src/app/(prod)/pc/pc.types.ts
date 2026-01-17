// apps/web/src/app/(prod)/pc/pc.types.ts

export type PcInspectorMode = 'create' | 'edit'

export type PcRow = {
  pc_id?: string | null
  id?: string | null

  pc_name?: string | null
  name?: string | null

  pc_code?: string | null
  code?: string | null

  pc_number?: string | number | null
  number?: string | number | null
  pc_no?: string | number | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreatePcInput = {
  name: string
  code?: string | null
  pc_number?: string | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'pc_number' | 'active'
