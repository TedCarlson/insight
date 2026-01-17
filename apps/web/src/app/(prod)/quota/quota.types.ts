// apps/web/src/app/(prod)/quota/quota.types.ts

export type QuotaInspectorMode = 'create' | 'edit'

export type QuotaRow = {
  quota_id?: string | null
  id?: string | null

  quota_name?: string | null
  name?: string | null

  quota_code?: string | null
  code?: string | null

  quota_value?: number | string | null
  value?: number | string | null
  target?: number | string | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreateQuotaInput = {
  name: string
  code?: string | null
  quota_value?: number | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'quota_value' | 'active'
