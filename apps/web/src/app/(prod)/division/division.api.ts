// apps/web/src/app/(prod)/division/division.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateDivisionInput, DivisionRow } from './division.types'

const supabase = createClient()

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `div_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function fetchFromViewById(divisionId: string): Promise<DivisionRow> {
  const { data, error } = await supabase
    .from('division_admin_v')
    .select('division_id, division_name, division_code')
    .eq('division_id', divisionId)
    .single()

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return data as DivisionRow
}

export async function fetchDivisions(): Promise<DivisionRow[]> {
  const { data, error } = await supabase
    .from('division_admin_v')
    .select('division_id, division_name, division_code')
    .order('division_name')

  if (error) {
    console.error('fetchDivisions error', error)
    throw error
  }

  return (data ?? []) as DivisionRow[]
}

export async function createDivision(input: CreateDivisionInput): Promise<DivisionRow> {
  const division_id = input.division_id?.trim() || newUuid()
  const division_name = input.division_name.trim()
  const division_code = input.division_code.trim()

  if (!division_name) throw new Error('Division name is required.')
  if (!division_code) throw new Error('Division code is required.')

  const { error } = await supabase.from('division').insert({ division_id, division_name, division_code })
  if (error) {
    console.error('createDivision insert error', error)
    throw error
  }

  return await fetchFromViewById(division_id)
}

export async function updateDivision(
  divisionId: string,
  patch: Partial<Pick<DivisionRow, 'division_name' | 'division_code'>>
): Promise<DivisionRow> {
  const payload: Record<string, any> = {}
  if (patch.division_name !== undefined) payload.division_name = String(patch.division_name ?? '').trim()
  if (patch.division_code !== undefined) payload.division_code = String(patch.division_code ?? '').trim()

  const { error } = await supabase.from('division').update(payload).eq('division_id', divisionId)
  if (error) {
    console.error('updateDivision error', error)
    throw error
  }

  return await fetchFromViewById(divisionId)
}
