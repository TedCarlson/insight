// apps/web/src/app/(prod)/region/region.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateRegionInput, RegionRow } from './region.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.region_id ?? row?.id
  if (!id) throw new Error('Could not determine region id from insert/update result.')
  return String(id)
}

async function tryInsertRegion(base: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    { region_name: base.name, region_code: base.code ?? null, is_active: base.active ?? true },
    { name: base.name, code: base.code ?? null, active: base.active ?? true },
    { region_name: base.name, code: base.code ?? null, active: base.active ?? true },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase.from('region').insert(payload).select('*').single()
    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertRegion failed', lastErr)
  throw lastErr
}

async function tryUpdateRegion(regionId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      ...(patch.name !== undefined ? { region_name: patch.name } : {}),
      ...(patch.code !== undefined ? { region_code: patch.code } : {}),
      ...(patch.active !== undefined ? { is_active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { region_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null

  for (const payload of candidates) {
    const { error } = await supabase.from('region').update(payload).eq('region_id', regionId)
    if (!error) return
    lastErr = error
  }

  for (const payload of candidates) {
    const { error } = await supabase.from('region').update(payload).eq('id', regionId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdateRegion failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(regionId: string): Promise<RegionRow> {
  let { data, error } = await supabase.from('region_admin_v').select('*').eq('region_id', regionId).single()
  if (!error && data) return data as RegionRow

  const res2 = await supabase.from('region_admin_v').select('*').eq('id', regionId).single()
  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as RegionRow
}

/* READ */
export async function fetchRegions(): Promise<RegionRow[]> {
  const { data, error } = await supabase.from('region_admin_v').select('*').limit(500)
  if (error) {
    console.error('fetchRegions error', error)
    throw error
  }
  return (data ?? []) as RegionRow[]
}

/* WRITE */
export async function createRegion(payload: CreateRegionInput): Promise<RegionRow> {
  const inserted = await tryInsertRegion(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updateRegion(regionId: string, patch: Partial<CreateRegionInput>): Promise<RegionRow> {
  await tryUpdateRegion(regionId, patch)
  return await fetchFromViewById(regionId)
}

export async function deleteRegion(regionId: string): Promise<void> {
  let { error } = await supabase.from('region').delete().eq('region_id', regionId)
  if (!error) return

  const res2 = await supabase.from('region').delete().eq('id', regionId)
  if (res2.error) {
    console.error('deleteRegion error', res2.error)
    throw res2.error
  }
}
