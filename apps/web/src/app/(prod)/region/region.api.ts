// apps/web/src/app/(prod)/region/region.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateRegionInput, RegionRow } from './region.types'

const supabase = createClient()

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUIDUUID' in crypto) {
    // (typo-proof guard not needed, but keep simple)
  }
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `reg_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function fetchFromViewById(regionId: string): Promise<RegionRow> {
  const { data, error } = await supabase
    .from('region_admin_v')
    .select('region_id, region_name, region_code')
    .eq('region_id', regionId)
    .single()

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return data as RegionRow
}

/** READ: view */
export async function fetchRegions(): Promise<RegionRow[]> {
  const { data, error } = await supabase
    .from('region_admin_v')
    .select('region_id, region_name, region_code')
    .order('region_name')

  if (error) {
    console.error('fetchRegions error', error)
    throw error
  }

  return (data ?? []) as RegionRow[]
}

/** CREATE: base, then re-read view */
export async function createRegion(input: CreateRegionInput): Promise<RegionRow> {
  const region_id = input.region_id?.trim() || newUuid()
  const region_name = input.region_name.trim()
  const region_code = input.region_code.trim()

  if (!region_name) throw new Error('Region name is required.')
  if (!region_code) throw new Error('Region code is required.')

  const { error } = await supabase.from('region').insert({
    region_id,
    region_name,
    region_code,
  })

  if (error) {
    console.error('createRegion insert error', error)
    throw error
  }

  return await fetchFromViewById(region_id)
}

/** UPDATE: base, then re-read view */
export async function updateRegion(
  regionId: string,
  patch: Partial<Pick<RegionRow, 'region_name' | 'region_code'>>
): Promise<RegionRow> {
  const payload: Record<string, any> = {}
  if (patch.region_name !== undefined) payload.region_name = String(patch.region_name ?? '').trim()
  if (patch.region_code !== undefined) payload.region_code = String(patch.region_code ?? '').trim()

  const { error } = await supabase.from('region').update(payload).eq('region_id', regionId)

  if (error) {
    console.error('updateRegion error', error)
    throw error
  }

  return await fetchFromViewById(regionId)
}
