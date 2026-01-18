
//apps/web/src/app/(prod)/person/person.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import { PersonRow } from './person.types'

const supabase = createClient()

/**
 * Fetch all persons (admin)
 * Authoritative read = person_admin_v
 */
export async function fetchPersons(): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from('person_admin_v')
    .select('*')
    .order('full_name')

  if (error) {
    console.error('fetchPersons error', error)
    throw error
  }

  return data as PersonRow[]
}

/**
 * Update person employer / org–scoped fields
 *
 * Writes:
 * - base table: person
 *
 * Reads:
 * - admin view: person_admin_v (authoritative)
 */
export async function updatePersonEmployer(
  personId: string,
  payload: {
    co_ref_id: string | null
    co_code: string | null
    active?: boolean | null
    role?: string | null
  }
): Promise<PersonRow> {
  const { error } = await supabase
    .from('person')
    .update(payload)
    .eq('person_id', personId)

  if (error) {
    console.error('updatePersonEmployer error', error)
    throw error
  }

  const { data, error: readError } = await supabase
    .from('person_admin_v')
    .select('*')
    .eq('person_id', personId)
    .single()

  if (readError) {
    console.error('post-update fetch error', readError)
    throw readError
  }

  return data as PersonRow
}

/**
 * Update core person fields (identity / contact / identifiers)
 *
 * Writes:
 * - base table: person
 *
 * Reads:
 * - admin view: person_admin_v (authoritative)
 */
export async function updatePersonCore(
  personId: string,
  payload: {
    full_name?: string | null
    emails?: string | null
    mobile?: string | null
    fuse_emp_id?: string | null
    person_nt_login?: string | null
    person_csg_id?: string | null
    person_notes?: string | null
  }
): Promise<PersonRow> {
  const { error } = await supabase
    .from('person')
    .update(payload)
    .eq('person_id', personId)

  if (error) {
    console.error('updatePersonCore error', error)
    throw error
  }

  const { data, error: readError } = await supabase
    .from('person_admin_v')
    .select('*')
    .eq('person_id', personId)
    .single()

  if (readError) {
    console.error('post-update fetch error', readError)
    throw readError
  }

  return data as PersonRow
}

/* ------------------------------------------------------------------ */
/* CREATE FLOW (Inspector only)                                        */
/* ------------------------------------------------------------------ */

/**
 * Advisory duplicate check
 * Identity = fuse_emp_id ONLY
 * Non-blocking (audit-oriented)
 */
async function checkPersonDuplicatesByFuseId(
  fuse_emp_id: string
): Promise<PersonRow[]> {
  const { data, error } = await supabase
    .from('person_admin_v')
    .select('*')
    .eq('fuse_emp_id', fuse_emp_id)

  if (error) {
    console.error('duplicate check error', error)
    throw error
  }

  return (data ?? []) as PersonRow[]
}

/**
 * Create a new person (Inspector create mode)
 *
 * Rules:
 * - Duplicate detection is advisory only
 * - Identity = fuse_emp_id
 * - Insert → rehydrate from admin view
 */
export async function createPerson(
  payload: {
    full_name: string
    emails?: string | null
    mobile?: string | null
    co_ref_id?: string | null
    active?: boolean | null
    role?: string | null
    fuse_emp_id?: string | null
    person_nt_login?: string | null
    person_csg_id?: string | null
    person_notes?: string | null
  },
  options?: {
    allowDuplicateFuse?: boolean
  }
): Promise<
  | { type: 'duplicate'; matches: PersonRow[] }
  | { type: 'created'; row: PersonRow }
> {
  const fuse = (payload.fuse_emp_id ?? '').trim()

  if (fuse && !options?.allowDuplicateFuse) {
    const matches = await checkPersonDuplicatesByFuseId(fuse)
    if (matches.length > 0) {
      return { type: 'duplicate', matches }
    }
  }

  const insertPayload = {
    ...payload,
    active: payload.active ?? true,
  }

  const { data: inserted, error: insertError } = await supabase
    .from('person')
    .insert(insertPayload)
    .select('person_id')
    .single()

  if (insertError) {
    console.error('createPerson insert error', insertError)
    throw insertError
  }

  const { data: row, error: readError } = await supabase
    .from('person_admin_v')
    .select('*')
    .eq('person_id', inserted.person_id)
    .single()

  if (readError) {
    console.error('createPerson post-read error', readError)
    throw readError
  }

  return { type: 'created', row: row as PersonRow }
}

/* ------------------------------------------------------------------ */
/* LIST (Server pagination/search)                                     */
/* ------------------------------------------------------------------ */

export type ListPersonsParams = {
  page: number
  pageSize: number
  q?: string
  active?: boolean | null
}

export async function listPersons(
  params: ListPersonsParams
): Promise<{ rows: PersonRow[]; total: number }> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 25)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('person_admin_v')
    .select('*', { count: 'exact' })
    .order('full_name')
    .range(from, to)

  const q = (params.q ?? '').trim()
  if (q) {
    const like = `%${q}%`
    query = query.or(`full_name.ilike.${like},emails.ilike.${like}`)
  }

  if (params.active !== undefined && params.active !== null) {
    query = query.eq('active', params.active)
  }

  const { data, count, error } = await query

  if (error) {
    console.error('listPersons error', error)
    throw error
  }

  return {
    rows: (data ?? []) as PersonRow[],
    total: count ?? 0,
  }
}
