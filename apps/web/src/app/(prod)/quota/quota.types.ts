// apps/web/src/app/(prod)/quota/quota.types.ts

export type QuotaInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.quota_admin_v
 * Columns: quota_id, route_id, route_name, q_units, q_hours
 */
export type QuotaRow = {
  quota_id: string
  route_id: string
  route_name: string | null
  q_units: number | null
  q_hours: number | null
}

/**
 * WRITE shape (base): public.quota
 * Required: quota_id, route_id
 * q_units, q_hours can be null or numbers (depending on DB constraints)
 */
export type CreateQuotaInput = {
  quota_id?: string
  route_id: string
  q_units: number | null
  q_hours: number | null
}

export type EditableField = 'route_id' | 'q_units' | 'q_hours'
