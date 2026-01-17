// apps/web/src/app/(prod)/quota/quota.types.ts

export type QuotaInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.quota_admin_v
 *
 * Expected columns (subset used by UI):
 * - quota_id
 * - route_id, route_name
 * - fiscal_month_id, fiscal_month_key, fiscal_month_label
 * - qh_sun..qh_sat (inputs)
 * - qu_sun..qu_sat (computed)
 * - qt_hours, qt_units (computed totals)
 * - pc_org_id, pc_org_name (context; may be null during transition)
 */
export type QuotaRow = {
  quota_id: string

  route_id: string
  route_name: string | null

  fiscal_month_id: string
  fiscal_month_key: string | null
  fiscal_month_label: string | null

  pc_org_id: string | null
  pc_org_name: string | null

  // inputs (hours)
  qh_sun: number
  qh_mon: number
  qh_tue: number
  qh_wed: number
  qh_thu: number
  qh_fri: number
  qh_sat: number

  // computed per-day units (qh * 12)
  qu_sun: number
  qu_mon: number
  qu_tue: number
  qu_wed: number
  qu_thu: number
  qu_fri: number
  qu_sat: number

  // computed totals
  qt_hours: number
  qt_units: number
}

/**
 * WRITE shape (base): public.quota
 * Required: route_id, fiscal_month_id
 * Editable: qh_sun..qh_sat
 *
 * quota_id is optional for create flows
 */
export type CreateQuotaInput = {
  quota_id?: string

  route_id: string
  fiscal_month_id: string

  qh_sun: number
  qh_mon: number
  qh_tue: number
  qh_wed: number
  qh_thu: number
  qh_fri: number
  qh_sat: number
}

export type EditableField =
  | 'route_id'
  | 'fiscal_month_id'
  | 'qh_sun'
  | 'qh_mon'
  | 'qh_tue'
  | 'qh_wed'
  | 'qh_thu'
  | 'qh_fri'
  | 'qh_sat'
