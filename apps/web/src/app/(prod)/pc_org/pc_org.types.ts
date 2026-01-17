// apps/web/src/app/(prod)/pc_org/pc_org.types.ts

export type PcOrgInspectorMode = 'create' | 'edit'

export type PcOrgRow = {
  pc_org_id?: string | null
  id?: string | null

  pc_org_name?: string | null
  name?: string | null

  pc_org_code?: string | null
  code?: string | null

  pc_number?: string | number | null
  pc_no?: string | number | null
  number?: string | number | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreatePcOrgInput = {
  name: string
  code?: string | null
  pc_number?: string | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'pc_number' | 'active'
