// apps/web/src/app/(prod)/quota/quota.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateQuotaInput, QuotaRow } from './quota.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.quota_id ?? row?.id
  if (!id) throw new Error('Could not determine quota id from insert/update result.')
  return String(id)
}

async function tryInsertQuota(base: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      quota_name: base.name,
      quota_code: base.code ?? null,
      quota_value: base.quota_value ?? null,
      is_active: base.active ?? true,
    },
    {
      name: base.name,
      code: base.code ?? null,
      value: base.quota_value ?? null,
      active: base.active ?? true,
    },
    {
      quota_name: base.name,
      code: base.code ?? null,
      target: base.quota_value ?? null,
      active: base.active ?? true,
    },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase.from('quota').insert(payload).select('*').single()
    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertQuota failed', lastErr)
  throw lastErr
}

async function tryUpdateQuota(quotaId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      ...(patch.name !== undefined ? { quota_name: patch.name } : {}),
      ...(patch.code !== undefined ? { quota_code: patch.code } : {}),
      ...(patch.quota_value !== undefined ? { quota_value: patch.quota_value } : {}),
      ...(patch.active !== undefined ? { is_active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.quota_value !== undefined ? { value: patch.quota_value } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { quota_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.quota_value !== undefined ? { target: patch.quota_value } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null

  for (const payload of candidates) {
    const { error } = await supabase.from('quota').update(payload).eq('quota_id', quotaId)
    if (!error) return
    lastErr = error
  }

  for (const payload of candidates) {
    const { error } = await supabase.from('quota').update(payload).eq('id', quotaId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdateQuota failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(quotaId: string): Promise<QuotaRow> {
  let { data, error } = await supabase.from('quota_admin_v').select('*').eq('quota_id', quotaId).single()
  if (!error && data) return data as QuotaRow

  const res2 = await supabase.from('quota_admin_v').select('*').eq('id', quotaId).single()
  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as QuotaRow
}

/* READ */
export async function fetchQuotas(): Promise<QuotaRow[]> {
  const { data, error } = await supabase.from('quota_admin_v').select('*').limit(500)
  if (error) {
    console.error('fetchQuotas error', error)
    throw error
  }
  return (data ?? []) as QuotaRow[]
}

/* WRITE */
export async function createQuota(payload: CreateQuotaInput): Promise<QuotaRow> {
  const inserted = await tryInsertQuota(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updateQuota(quotaId: string, patch: Partial<CreateQuotaInput>): Promise<QuotaRow> {
  await tryUpdateQuota(quotaId, patch)
  return await fetchFromViewById(quotaId)
}

export async function deleteQuota(quotaId: string): Promise<void> {
  let { error } = await supabase.from('quota').delete().eq('quota_id', quotaId)
  if (!error) return

  const res2 = await supabase.from('quota').delete().eq('id', quotaId)
  if (res2.error) {
    console.error('deleteQuota error', res2.error)
    throw res2.error
  }
}
