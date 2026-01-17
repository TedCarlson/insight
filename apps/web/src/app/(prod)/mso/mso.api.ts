// apps/web/src/app/(prod)/mso/mso.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateMsoInput, MsoRow } from './mso.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.mso_id ?? row?.id
  if (!id) throw new Error('Could not determine mso id from insert/update result.')
  return String(id)
}

async function tryInsertMso(basePayload: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    { mso_name: basePayload.name, mso_code: basePayload.code ?? null, is_active: basePayload.active ?? true },
    { name: basePayload.name, code: basePayload.code ?? null, active: basePayload.active ?? true },
    { mso_name: basePayload.name, code: basePayload.code ?? null, active: basePayload.active ?? true },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase.from('mso').insert(payload).select('*').single()
    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertMso failed', lastErr)
  throw lastErr
}

async function tryUpdateMso(msoId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      ...(patch.name !== undefined ? { mso_name: patch.name } : {}),
      ...(patch.code !== undefined ? { mso_code: patch.code } : {}),
      ...(patch.active !== undefined ? { is_active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { mso_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null

  for (const payload of candidates) {
    const { error } = await supabase.from('mso').update(payload).eq('mso_id', msoId)
    if (!error) return
    lastErr = error
  }

  for (const payload of candidates) {
    const { error } = await supabase.from('mso').update(payload).eq('id', msoId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdateMso failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(msoId: string): Promise<MsoRow> {
  let { data, error } = await supabase.from('mso_admin_v').select('*').eq('mso_id', msoId).single()
  if (!error && data) return data as MsoRow

  const res2 = await supabase.from('mso_admin_v').select('*').eq('id', msoId).single()
  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as MsoRow
}

/* READ */
export async function fetchMsos(): Promise<MsoRow[]> {
  const { data, error } = await supabase.from('mso_admin_v').select('*').limit(500)
  if (error) {
    console.error('fetchMsos error', error)
    throw error
  }
  return (data ?? []) as MsoRow[]
}

/* WRITE */
export async function createMso(payload: CreateMsoInput): Promise<MsoRow> {
  const inserted = await tryInsertMso(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updateMso(msoId: string, patch: Partial<CreateMsoInput>): Promise<MsoRow> {
  await tryUpdateMso(msoId, patch)
  return await fetchFromViewById(msoId)
}

export async function deleteMso(msoId: string): Promise<void> {
  let { error } = await supabase.from('mso').delete().eq('mso_id', msoId)
  if (!error) return

  const res2 = await supabase.from('mso').delete().eq('id', msoId)
  if (res2.error) {
    console.error('deleteMso error', res2.error)
    throw res2.error
  }
}
