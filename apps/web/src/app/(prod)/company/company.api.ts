// apps/web/src/app/(prod)/company/company.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CompanyRow, CreateCompanyInput } from './company.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.company_id ?? row?.id
  if (!id) throw new Error('Could not determine company id from insert/update result.')
  return String(id)
}

/**
 * Some schemas use company_name/is_active, others use name/active.
 * We try a small set of payload variants so the UI "engine" can run even
 * if column names differ across environments.
 */
async function tryInsertCompany(basePayload: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    // likely canonical
    {
      company_name: basePayload.name,
      company_code: basePayload.code ?? null,
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
      company_name: basePayload.name,
      code: basePayload.code ?? null,
      active: basePayload.active ?? true,
    },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase
      .from('company')
      .insert(payload)
      .select('*')
      .single()

    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertCompany failed', lastErr)
  throw lastErr
}

async function tryUpdateCompany(companyId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    // canonical
    {
      ...(patch.name !== undefined ? { company_name: patch.name } : {}),
      ...(patch.code !== undefined ? { company_code: patch.code } : {}),
      ...(patch.active !== undefined ? { is_active: patch.active } : {}),
    },
    // alternates
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
    // mixed
    {
      ...(patch.name !== undefined ? { company_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { error } = await supabase.from('company').update(payload).eq('company_id', companyId)
    if (!error) return
    lastErr = error
  }

  // last fallback: maybe PK column is "id"
  for (const payload of candidates) {
    const { error } = await supabase.from('company').update(payload).eq('id', companyId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdateCompany failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(companyId: string): Promise<CompanyRow> {
  // try company_id first, fallback to id
  let { data, error } = await supabase
    .from('company_admin_v')
    .select('*')
    .eq('company_id', companyId)
    .single()

  if (!error && data) return data as CompanyRow

  const res2 = await supabase.from('company_admin_v').select('*').eq('id', companyId).single()
  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as CompanyRow
}

/* ------------------------------------------------------------------ */
/* READ                                                               */
/* ------------------------------------------------------------------ */

export async function fetchCompanies(): Promise<CompanyRow[]> {
  // We keep ordering light because some views may not have company_name.
  const { data, error } = await supabase.from('company_admin_v').select('*').limit(500)

  if (error) {
    console.error('fetchCompanies error', error)
    throw error
  }

  return (data ?? []) as CompanyRow[]
}

/* ------------------------------------------------------------------ */
/* WRITE                                                              */
/* ------------------------------------------------------------------ */

export async function createCompany(payload: CreateCompanyInput): Promise<CompanyRow> {
  const inserted = await tryInsertCompany(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updateCompany(
  companyId: string,
  patch: Partial<CreateCompanyInput>
): Promise<CompanyRow> {
  await tryUpdateCompany(companyId, patch)
  return await fetchFromViewById(companyId)
}

export async function deleteCompany(companyId: string): Promise<void> {
  // try company_id PK first, fallback to id
  let { error } = await supabase.from('company').delete().eq('company_id', companyId)
  if (!error) return

  const res2 = await supabase.from('company').delete().eq('id', companyId)
  if (res2.error) {
    console.error('deleteCompany error', res2.error)
    throw res2.error
  }
}
