// apps/web/src/app/(prod)/schedule/schedule.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateScheduleInput, ScheduleRow } from './schedule.types'

const supabase = createClient()

/**
 * View reads are "un-typed" via (supabase as any) to avoid GenericStringError issues
 * when views are not present in generated Supabase Database types.
 *
 * Planned authoritative read:
 * - schedule_admin_v
 *
 * Base table writes (planned):
 * - schedule
 */

const SCHEDULE_ADMIN_SELECT = [
  'schedule_id',
  'schedule_name',
  'route_id',
  'route_name',
  'fiscal_month_id',
  'fiscal_month_label',
  'active',
  'created_at',
  'updated_at',
].join(', ')

/* ------------------------------------------------------------------ */
/* LIST (Server pagination/search)                                     */
/* ------------------------------------------------------------------ */

export type ListSchedulesParams = {
  page: number
  pageSize: number
  q?: string
  active?: boolean | null
}

export async function listSchedules(
  params: ListSchedulesParams
): Promise<{ rows: ScheduleRow[]; total: number }> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 25)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = (supabase as any)
    .from('schedule_admin_v')
    .select(SCHEDULE_ADMIN_SELECT, { count: 'exact' })
    .order('updated_at', { ascending: false, nullsFirst: false })
    .range(from, to)

  const q = (params.q ?? '').trim()
  if (q) {
    const like = `%${q}%`
    query = query.or(
      [
        `schedule_name.ilike.${like}`,
        `route_name.ilike.${like}`,
        `fiscal_month_label.ilike.${like}`,
        `schedule_id.ilike.${like}`,
      ].join(',')
    )
  }

  if (params.active !== undefined && params.active !== null) {
    query = query.eq('active', params.active)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('listSchedules error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to load schedules.')
  }

  return {
    rows: (data ?? []) as unknown as ScheduleRow[],
    total: count ?? 0,
  }
}

/* ------------------------------------------------------------------ */
/* CREATE / UPDATE (stubs until base table & view are finalized)       */
/* ------------------------------------------------------------------ */

export async function createSchedule(_input: CreateScheduleInput): Promise<ScheduleRow> {
  throw new Error('createSchedule not implemented yet (planning module pending).')
}

export async function updateSchedule(
  _scheduleId: string,
  _patch: Partial<ScheduleRow>
): Promise<ScheduleRow> {
  throw new Error('updateSchedule not implemented yet (planning module pending).')
}
