// apps/web/src/app/(prod)/quota/quota.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateQuotaInput, QuotaRow } from './quota.types'

const supabase = createClient()

/**
 * This file intentionally “un-types” reads from views (quota_admin_v) because your
 * generated Supabase Database types likely don’t include those views, which causes
 * GenericStringError typing conflicts. Base-table writes remain normal.
 */

function uuidv4(): string {
  // Use globalThis to avoid TS narrowing issues (crypto sometimes typed oddly in mixed envs)
  const c = (globalThis as any)?.crypto as
    | {
        randomUUID?: () => string
        getRandomValues?: (array: Uint8Array) => Uint8Array
      }
    | undefined

  if (c?.randomUUID) return c.randomUUID()

  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16)
    c.getRandomValues(bytes)

    // RFC 4122 v4
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(
      16,
      20
    )}-${hex.slice(20)}`
  }

  // Very last resort: deterministic-ish fallback (still UUID-shaped; avoid if you can)
  // This prevents runtime crashes in environments without WebCrypto typings.
  const s = `${Date.now()}_${Math.random()}_${Math.random()}`
  const hex = Array.from(s)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(32, '0')
    .slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(
    17,
    20
  )}-${hex.slice(20)}`
}

const QUOTA_ADMIN_SELECT = [
  'quota_id',
  'route_id',
  'route_name',

  'fiscal_month_id',
  'fiscal_month_key',
  'fiscal_month_label',
  'fiscal_month_start_date',
  'fiscal_month_end_date',

  'pc_org_id',
  'pc_org_name',

  'qh_sun',
  'qh_mon',
  'qh_tue',
  'qh_wed',
  'qh_thu',
  'qh_fri',
  'qh_sat',

  'qu_sun',
  'qu_mon',
  'qu_tue',
  'qu_wed',
  'qu_thu',
  'qu_fri',
  'qu_sat',

  'qt_hours',
  'qt_units',
].join(', ')

async function fetchFromViewById(quotaId: string): Promise<QuotaRow> {
  const { data, error } = await (supabase as any)
    .from('quota_admin_v')
    .select(QUOTA_ADMIN_SELECT)
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

  return data as unknown as QuotaRow
}

/** READ: view */
export async function fetchQuotas(): Promise<QuotaRow[]> {
  const { data, error } = await (supabase as any)
    .from('quota_admin_v')
    .select(QUOTA_ADMIN_SELECT)
    .order('fiscal_month_start_date', { ascending: false })
    .order('route_name', { ascending: true })

  if (error) {
    console.error('fetchQuotas error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to load quotas.')
  }

  return (data ?? []) as unknown as QuotaRow[]
}

/** CREATE: base table, then re-read view */
export async function createQuota(input: CreateQuotaInput): Promise<QuotaRow> {
  const quota_id = input.quota_id?.trim() || uuidv4()
  const route_id = String(input.route_id ?? '').trim()
  const fiscal_month_id = String(input.fiscal_month_id ?? '').trim()

  if (!route_id) throw new Error('Route is required.')
  if (!fiscal_month_id) throw new Error('Fiscal month is required.')

  const insertPayload = {
    quota_id,
    route_id,
    fiscal_month_id,

    qh_sun: Number(input.qh_sun ?? 0),
    qh_mon: Number(input.qh_mon ?? 0),
    qh_tue: Number(input.qh_tue ?? 0),
    qh_wed: Number(input.qh_wed ?? 0),
    qh_thu: Number(input.qh_thu ?? 0),
    qh_fri: Number(input.qh_fri ?? 0),
    qh_sat: Number(input.qh_sat ?? 0),
  }

  const { error } = await supabase.from('quota').insert(insertPayload)

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
  patch: Partial<
    Pick<
      QuotaRow,
      | 'route_id'
      | 'fiscal_month_id'
      | 'qh_sun'
      | 'qh_mon'
      | 'qh_tue'
      | 'qh_wed'
      | 'qh_thu'
      | 'qh_fri'
      | 'qh_sat'
    >
  >
): Promise<QuotaRow> {
  const payload: Record<string, any> = {}

  if (patch.route_id !== undefined) payload.route_id = String(patch.route_id ?? '').trim()
  if (patch.fiscal_month_id !== undefined)
    payload.fiscal_month_id = String(patch.fiscal_month_id ?? '').trim()

  if (patch.qh_sun !== undefined) payload.qh_sun = Number(patch.qh_sun ?? 0)
  if (patch.qh_mon !== undefined) payload.qh_mon = Number(patch.qh_mon ?? 0)
  if (patch.qh_tue !== undefined) payload.qh_tue = Number(patch.qh_tue ?? 0)
  if (patch.qh_wed !== undefined) payload.qh_wed = Number(patch.qh_wed ?? 0)
  if (patch.qh_thu !== undefined) payload.qh_thu = Number(patch.qh_thu ?? 0)
  if (patch.qh_fri !== undefined) payload.qh_fri = Number(patch.qh_fri ?? 0)
  if (patch.qh_sat !== undefined) payload.qh_sat = Number(patch.qh_sat ?? 0)

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

/* ------------------------------------------------------------------ */
/* LIST (Server pagination/search)                                     */
/* ------------------------------------------------------------------ */

export type ListQuotasParams = {
  page: number
  pageSize: number
  q?: string
}

export async function listQuotas(
  params: ListQuotasParams
): Promise<{ rows: QuotaRow[]; total: number }> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 25)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = (supabase as any)
    .from('quota_admin_v')
    .select(QUOTA_ADMIN_SELECT, { count: 'exact' })
    .order('fiscal_month_start_date', { ascending: false })
    .order('route_name', { ascending: true })
    .range(from, to)

  const q = (params.q ?? '').trim()
  if (q) {
    const like = `%${q}%`
    query = query.or(
      [
        `route_name.ilike.${like}`,
        `pc_org_name.ilike.${like}`,
        `fiscal_month_label.ilike.${like}`,
        `fiscal_month_key.ilike.${like}`,
        `route_id.ilike.${like}`,
        `quota_id.ilike.${like}`,
      ].join(',')
    )
  }

  const { data, count, error } = await query

  if (error) {
    console.error('listQuotas error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to load quotas.')
  }

  return {
    rows: (data ?? []) as unknown as QuotaRow[],
    total: count ?? 0,
  }
}
