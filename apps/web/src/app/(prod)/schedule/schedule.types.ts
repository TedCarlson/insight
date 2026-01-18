// apps/web/src/app/(prod)/schedule/schedule.types.ts

export type ScheduleInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.schedule_admin_v (planned)
 * Keep this intentionally minimal for now; expand when planning module lands.
 */
export type ScheduleRow = {
  schedule_id: string
  schedule_name: string | null

  // Optional context (future-proof; safe to be null)
  route_id?: string | null
  route_name?: string | null

  fiscal_month_id?: string | null
  fiscal_month_label?: string | null

  active?: boolean | null
  created_at?: string | null
  updated_at?: string | null
}

export type CreateScheduleInput = {
  schedule_name: string
  route_id?: string | null
  fiscal_month_id?: string | null
  active?: boolean | null
}

export type EditableField = 'schedule_name' | 'route_id' | 'fiscal_month_id' | 'active'
