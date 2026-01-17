// apps/web/src/app/(prod)/quota/quota.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateQuotaInput, QuotaRow } from './quota.types'

const supabase = createClient()

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `quota_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function fetchFromViewById(quotaId: string): Promise<QuotaRow> {
  const { data, error } = await supabase
    .from('quota_admin_v')
    .select('quota_id, route_id, route_name, q_units, q_hours')
    .eq('quota_id', quotaId)
    .single()

  if (error) {
    console.error('fetchFromViewById quota error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to fetch quota.')
  }

  return data as QuotaRow
}

/** READ: view */
export async function fetchQuotas(): Promise<QuotaRow[]> {
  const { data, error } = await supabase
    .from('quota_admin_v')
    .select('quota_id, route_id, route_name, q_units, q_hours')
    .order('route_name')

  if (error) {
    console.error('fetchQuotas error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to load quotas.')
  }

  return (data ?? []) as QuotaRow[]
}

/** CREATE: base table, then re-read view */
export async function createQuota(input: CreateQuotaInput): Promise<QuotaRow> {
  const quota_id = input.quota_id?.trim() || newUuid()
  const route_id = input.route_id.trim()

  if (!route_id) throw new Error('Route is required.')

  const { error } = await supabase.from('quota').insert({
    quota_id,
    route_id,
    q_units: input.q_units,
    q_hours: input.q_hours,
  })

  if (error) {
    console.error('createQuota insert error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Create quota failed.')
  }

  return await fetchFromViewById(quota_id)
}

/** UPDATE: base table, then re-read view */
export async function updateQuota(
  quotaId: string,
  patch: Partial<Pick<QuotaRow, 'route_id' | 'q_units' | 'q_hours'>>
): Promise<QuotaRow> {
  const payload: Record<string, any> = {}

  if (patch.route_id !== undefined) payload.route_id = String(patch.route_id ?? '').trim()
  if (patch.q_units !== undefined) payload.q_units = patch.q_units
  if (patch.q_hours !== undefined) payload.q_hours = patch.q_hours

  const { error } = await supabase.from('quota').update(payload).eq('quota_id', quotaId)

  if (error) {
    console.error('updateQuota error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Update quota failed.')
  }

  return await fetchFromViewById(quotaId)
}
