// apps/web/src/app/(prod)/contractor/contractor.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { ContractorRow, CreateContractorInput } from './contractor.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.contractor_id ?? row?.id
  if (!id) throw new Error('Could not determine contractor id from insert/update result.')
  return String(id)
}

/**
 * Insert/update try a few common column variants so the UI "engine" runs
 * even if the base table uses slightly different column names.
 */
async function tryInsertContractor(basePayload: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    // likely canonical
    {
      contractor_name: basePayload.name,
      contractor_code: basePayload.code ?? null,
      is_active: basePayload.active ?? true,
    },
    // common alternates
    {
      name: basePayload.name,
      code: basePayload.code ?? null,
      active: basePayload.active ?? true,
    },
    // mixed
    {
      contractor_name: basePayload.name,
      code: basePayload.code ?? null,
      active: basePayload.active ?? true,
    },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase
      .from('contractor')
      .insert(payload)
      .select('*')
      .single()

    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertContractor failed', lastErr)
  throw lastErr
}

async function tryUpdateContractor(contractorId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      ...(patch.name !== undefined ? { contractor_name: patch.name } : {}),
      ...(patch.code !== undefined ? { contractor_code: patch.code } : {}),
      ...(patch.active !== undefined ? { is_active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { contractor_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null

  for (const payload of candidates) {
    const { error } = await supabase.from('contractor').update(payload).eq('contractor_id', contractorId)
    if (!error) return
    lastErr = error
  }

  // fallback PK name
  for (const payload of candidates) {
    const { error } = await supabase.from('contractor').update(payload).eq('id', contractorId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdateContractor failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(contractorId: string): Promise<ContractorRow> {
  let { data, error } = await supabase
    .from('contractor_admin_v')
    .select('*')
    .eq('contractor_id', contractorId)
    .single()

  if (!error && data) return data as ContractorRow

  const res2 = await supabase
    .from('contractor_admin_v')
    .select('*')
    .eq('id', contractorId)
    .single()

  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as ContractorRow
}

/* ------------------------------------------------------------------ */
/* READ                                                               */
/* ------------------------------------------------------------------ */

export async function fetchContractors(): Promise<ContractorRow[]> {
  const { data, error } = await supabase.from('contractor_admin_v').select('*').limit(500)

  if (error) {
    console.error('fetchContractors error', error)
    throw error
  }

  return (data ?? []) as ContractorRow[]
}

/* ------------------------------------------------------------------ */
/* WRITE                                                              */
/* ------------------------------------------------------------------ */

export async function createContractor(payload: CreateContractorInput): Promise<ContractorRow> {
  const inserted = await tryInsertContractor(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updateContractor(
  contractorId: string,
  patch: Partial<CreateContractorInput>
): Promise<ContractorRow> {
  await tryUpdateContractor(contractorId, patch)
  return await fetchFromViewById(contractorId)
}

export async function deleteContractor(contractorId: string): Promise<void> {
  let { error } = await supabase.from('contractor').delete().eq('contractor_id', contractorId)
  if (!error) return

  const res2 = await supabase.from('contractor').delete().eq('id', contractorId)
  if (res2.error) {
    console.error('deleteContractor error', res2.error)
    throw res2.error
  }
}
