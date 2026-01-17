// apps/web/src/app/(prod)/pc_org/pc_org.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreatePcOrgInput, PcOrgRow } from './pc_org.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.pc_org_id ?? row?.id
  if (!id) throw new Error('Could not determine pc_org id from insert/update result.')
  return String(id)
}

async function tryInsertPcOrg(base: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      pc_org_name: base.name,
      pc_org_code: base.code ?? null,
      pc_number: base.pc_number ?? null,
      is_active: base.active ?? true,
    },
    {
      name: base.name,
      code: base.code ?? null,
      number: base.pc_number ?? null,
      active: base.active ?? true,
    },
    {
      pc_org_name: base.name,
      code: base.code ?? null,
      pc_no: base.pc_number ?? null,
      active: base.active ?? true,
    },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase.from('pc_org').insert(payload).select('*').single()
    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertPcOrg failed', lastErr)
  throw lastErr
}

async function tryUpdatePcOrg(pcOrgId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      ...(patch.name !== undefined ? { pc_org_name: patch.name } : {}),
      ...(patch.code !== undefined ? { pc_org_code: patch.code } : {}),
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
      ...(patch.name !== undefined ? { pc_org_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.pc_number !== undefined ? { pc_no: patch.pc_number } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null

  for (const payload of candidates) {
    const { error } = await supabase.from('pc_org').update(payload).eq('pc_org_id', pcOrgId)
    if (!error) return
    lastErr = error
  }

  for (const payload of candidates) {
    const { error } = await supabase.from('pc_org').update(payload).eq('id', pcOrgId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdatePcOrg failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(pcOrgId: string): Promise<PcOrgRow> {
  let { data, error } = await supabase.from('pc_org_admin_v').select('*').eq('pc_org_id', pcOrgId).single()
  if (!error && data) return data as PcOrgRow

  const res2 = await supabase.from('pc_org_admin_v').select('*').eq('id', pcOrgId).single()
  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as PcOrgRow
}

/* READ */
export async function fetchPcOrgs(): Promise<PcOrgRow[]> {
  const { data, error } = await supabase.from('pc_org_admin_v').select('*').limit(500)
  if (error) {
    console.error('fetchPcOrgs error', error)
    throw error
  }
  return (data ?? []) as PcOrgRow[]
}

/* WRITE */
export async function createPcOrg(payload: CreatePcOrgInput): Promise<PcOrgRow> {
  const inserted = await tryInsertPcOrg(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updatePcOrg(pcOrgId: string, patch: Partial<CreatePcOrgInput>): Promise<PcOrgRow> {
  await tryUpdatePcOrg(pcOrgId, patch)
  return await fetchFromViewById(pcOrgId)
}

export async function deletePcOrg(pcOrgId: string): Promise<void> {
  let { error } = await supabase.from('pc_org').delete().eq('pc_org_id', pcOrgId)
  if (!error) return

  const res2 = await supabase.from('pc_org').delete().eq('id', pcOrgId)
  if (res2.error) {
    console.error('deletePcOrg error', res2.error)
    throw res2.error
  }
}
