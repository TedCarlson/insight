// apps/web/src/app/(prod)/mso/mso.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateMsoInput, MsoRow } from './mso.types'

const supabase = createClient()

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `mso_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function fetchFromViewById(msoId: string): Promise<MsoRow> {
  const { data, error } = await supabase
    .from('mso_admin_v')
    .select('mso_id, mso_name')
    .eq('mso_id', msoId)
    .single()

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return data as MsoRow
}

export async function fetchMsos(): Promise<MsoRow[]> {
  const { data, error } = await supabase
    .from('mso_admin_v')
    .select('mso_id, mso_name')
    .order('mso_name')

  if (error) {
    console.error('fetchMsos error', error)
    throw error
  }

  return (data ?? []) as MsoRow[]
}

export async function createMso(input: CreateMsoInput): Promise<MsoRow> {
  const mso_id = input.mso_id?.trim() || newUuid()
  const mso_name = input.mso_name.trim()

  if (!mso_name) throw new Error('MSO name is required.')

  const { error } = await supabase.from('mso').insert({ mso_id, mso_name })
  if (error) {
    console.error('createMso insert error', error)
    throw error
  }

  return await fetchFromViewById(mso_id)
}

export async function updateMso(
  msoId: string,
  patch: Partial<Pick<MsoRow, 'mso_name'>>
): Promise<MsoRow> {
  const payload: Record<string, any> = {}
  if (patch.mso_name !== undefined) payload.mso_name = String(patch.mso_name ?? '').trim()

  const { error } = await supabase.from('mso').update(payload).eq('mso_id', msoId)
  if (error) {
    console.error('updateMso error', error)
    throw error
  }

  return await fetchFromViewById(msoId)
}
