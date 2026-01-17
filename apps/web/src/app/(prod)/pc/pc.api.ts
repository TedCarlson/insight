// apps/web/src/app/(prod)/pc/pc.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreatePcInput, PcRow } from './pc.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.pc_id ?? row?.id
  if (!id) throw new Error('Could not determine pc id from insert/update result.')
  return String(id)
}

async function tryInsertPc(base: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    // likely canonical
    {
      pc_name: base.name,
      pc_code: base.code ?? null,
      pc_number: base.pc_number ?? null,
      is_active: base.active ?? true,
    },
    // common alternates
    {
      name: base.name,
      code: base.code ?? null,
      number: base.pc_number ?? null,
      active: base.active ?? true,
    },
    // mixed
    {
      pc_name: base.name,
      code: base.code ?? null,
      pc_no: base.pc_number ?? null,
      active: base.active ?? true,
    },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase.from('pc').insert(payload).select('*').single()
    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertPc failed', lastErr)
  throw lastErr
}

async function tryUpdatePc(pcId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      ...(patch.name !== undefined ? { pc_name: patch.name } : {}),
      ...(patch.code !== undefined ? { pc_code: patch.code } : {}),
      ...(patch.pc_number !== undefined ? { pc_number: patch.pc_number } : {}),
      ...(patch.active !== undefined ? { is_active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.pc_number !== undefined ? { number: patch.pc_number } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { pc_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.pc_number !== undefined ? { pc_no: patch.pc_number } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null

  for (const payload of candidates) {
    const { error } = await supabase.from('pc').update(payload).eq('pc_id', pcId)
    if (!error) return
    lastErr = error
  }

  for (const payload of candidates) {
    const { error } = await supabase.from('pc').update(payload).eq('id', pcId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdatePc failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(pcId: string): Promise<PcRow> {
  let { data, error } = await supabase.from('pc_admin_v').select('*').eq('pc_id', pcId).single()
  if (!error && data) return data as PcRow

  const res2 = await supabase.from('pc_admin_v').select('*').eq('id', pcId).single()
  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as PcRow
}

/* READ */
export async function fetchPcs(): Promise<PcRow[]> {
  const { data, error } = await supabase.from('pc_admin_v').select('*').limit(500)
  if (error) {
    console.error('fetchPcs error', error)
    throw error
  }
  return (data ?? []) as PcRow[]
}

/* WRITE */
export async function createPc(payload: CreatePcInput): Promise<PcRow> {
  const inserted = await tryInsertPc(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updatePc(pcId: string, patch: Partial<CreatePcInput>): Promise<PcRow> {
  await tryUpdatePc(pcId, patch)
  return await fetchFromViewById(pcId)
}

export async function deletePc(pcId: string): Promise<void> {
  let { error } = await supabase.from('pc').delete().eq('pc_id', pcId)
  if (!error) return

  const res2 = await supabase.from('pc').delete().eq('id', pcId)
  if (res2.error) {
    console.error('deletePc error', res2.error)
    throw res2.error
  }
}
