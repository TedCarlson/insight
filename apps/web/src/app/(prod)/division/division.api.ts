// apps/web/src/app/(prod)/division/division.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateDivisionInput, DivisionRow } from './division.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.division_id ?? row?.id
  if (!id) throw new Error('Could not determine division id from insert/update result.')
  return String(id)
}

async function tryInsertDivision(basePayload: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    { division_name: basePayload.name, division_code: basePayload.code ?? null, is_active: basePayload.active ?? true },
    { name: basePayload.name, code: basePayload.code ?? null, active: basePayload.active ?? true },
    { division_name: basePayload.name, code: basePayload.code ?? null, active: basePayload.active ?? true },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase.from('division').insert(payload).select('*').single()
    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertDivision failed', lastErr)
  throw lastErr
}

async function tryUpdateDivision(divisionId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      ...(patch.name !== undefined ? { division_name: patch.name } : {}),
      ...(patch.code !== undefined ? { division_code: patch.code } : {}),
      ...(patch.active !== undefined ? { is_active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { division_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null

  for (const payload of candidates) {
    const { error } = await supabase.from('division').update(payload).eq('division_id', divisionId)
    if (!error) return
    lastErr = error
  }

  for (const payload of candidates) {
    const { error } = await supabase.from('division').update(payload).eq('id', divisionId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdateDivision failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(divisionId: string): Promise<DivisionRow> {
  let { data, error } = await supabase.from('division_admin_v').select('*').eq('division_id', divisionId).single()
  if (!error && data) return data as DivisionRow

  const res2 = await supabase.from('division_admin_v').select('*').eq('id', divisionId).single()
  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as DivisionRow
}

/* READ */
export async function fetchDivisions(): Promise<DivisionRow[]> {
  const { data, error } = await supabase.from('division_admin_v').select('*').limit(500)
  if (error) {
    console.error('fetchDivisions error', error)
    throw error
  }
  return (data ?? []) as DivisionRow[]
}

/* WRITE */
export async function createDivision(payload: CreateDivisionInput): Promise<DivisionRow> {
  const inserted = await tryInsertDivision(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updateDivision(
  divisionId: string,
  patch: Partial<CreateDivisionInput>
): Promise<DivisionRow> {
  await tryUpdateDivision(divisionId, patch)
  return await fetchFromViewById(divisionId)
}

export async function deleteDivision(divisionId: string): Promise<void> {
  let { error } = await supabase.from('division').delete().eq('division_id', divisionId)
  if (!error) return

  const res2 = await supabase.from('division').delete().eq('id', divisionId)
  if (res2.error) {
    console.error('deleteDivision error', res2.error)
    throw res2.error
  }
}
