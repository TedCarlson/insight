// apps/web/src/app/(prod)/pc_org/pc_org.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreatePcOrgInput, PcOrgRow } from './pc_org.types'

const supabase = createClient()

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `pcorg_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function fetchFromViewById(pcOrgId: string): Promise<PcOrgRow> {
  const { data, error } = await supabase
    .from('pc_org_admin_v')
    .select(
      'pc_org_id, pc_org_name, pc_id, pc_number, division_id, division_name, region_id, region_name, mso_id, mso_name'
    )
    .eq('pc_org_id', pcOrgId)
    .single()

  if (error) {
    console.error('fetchFromViewById pc_org error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to fetch PC Org.')
  }

  return data as PcOrgRow
}

/** READ: view */
export async function fetchPcOrgs(): Promise<PcOrgRow[]> {
  const { data, error } = await supabase
    .from('pc_org_admin_v')
    .select(
      'pc_org_id, pc_org_name, pc_id, pc_number, division_id, division_name, region_id, region_name, mso_id, mso_name'
    )
    .order('pc_org_name')

  if (error) {
    console.error('fetchPcOrgs error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to load PC Orgs.')
  }

  return (data ?? []) as PcOrgRow[]
}

/** CREATE: base table, then re-read view */
export async function createPcOrg(input: CreatePcOrgInput): Promise<PcOrgRow> {
  const pc_org_id = input.pc_org_id?.trim() || newUuid()
  const pc_org_name = input.pc_org_name.trim()

  const pc_id = input.pc_id.trim()
  const division_id = input.division_id.trim()
  const region_id = input.region_id.trim()
  const mso_id = input.mso_id.trim()

  if (!pc_org_name) throw new Error('PC Org name is required.')
  if (!pc_id) throw new Error('PC is required.')
  if (!division_id) throw new Error('Division is required.')
  if (!region_id) throw new Error('Region is required.')
  if (!mso_id) throw new Error('MSO is required.')

  const { error } = await supabase.from('pc_org').insert({
    pc_org_id,
    pc_org_name,
    pc_id,
    division_id,
    region_id,
    mso_id,
  })

  if (error) {
    console.error('createPcOrg insert error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Create PC Org failed.')
  }

  return await fetchFromViewById(pc_org_id)
}

/** UPDATE: base table, then re-read view */
export async function updatePcOrg(
  pcOrgId: string,
  patch: Partial<Pick<PcOrgRow, 'pc_org_name' | 'pc_id' | 'division_id' | 'region_id' | 'mso_id'>>
): Promise<PcOrgRow> {
  const payload: Record<string, any> = {}

  if (patch.pc_org_name !== undefined) payload.pc_org_name = String(patch.pc_org_name ?? '').trim()
  if (patch.pc_id !== undefined) payload.pc_id = String(patch.pc_id ?? '').trim()
  if (patch.division_id !== undefined) payload.division_id = String(patch.division_id ?? '').trim()
  if (patch.region_id !== undefined) payload.region_id = String(patch.region_id ?? '').trim()
  if (patch.mso_id !== undefined) payload.mso_id = String(patch.mso_id ?? '').trim()

  const { error } = await supabase.from('pc_org').update(payload).eq('pc_org_id', pcOrgId)

  if (error) {
    console.error('updatePcOrg error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Update PC Org failed.')
  }

  return await fetchFromViewById(pcOrgId)
}
