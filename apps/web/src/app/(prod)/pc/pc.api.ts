// apps/web/src/app/(prod)/pc/pc.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreatePcInput, PcRow } from './pc.types'

const supabase = createClient()

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `pc_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function fetchFromViewById(pcId: string): Promise<PcRow> {
  const { data, error } = await supabase
    .from('pc_admin_v')
    .select('pc_id, pc_number')
    .eq('pc_id', pcId)
    .single()

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return data as PcRow
}

/** READ: view */
export async function fetchPcs(): Promise<PcRow[]> {
  const { data, error } = await supabase
    .from('pc_admin_v')
    .select('pc_id, pc_number')
    .order('pc_number')

  if (error) {
    console.error('fetchPcs error', error)
    throw error
  }

  return (data ?? []) as PcRow[]
}

/** CREATE: base table, then re-read view */
export async function createPc(input: CreatePcInput): Promise<PcRow> {
  const pc_id = input.pc_id?.trim() || newUuid()
  const pc_number = input.pc_number.trim()

  if (!pc_number) throw new Error('PC number is required.')

  const { error } = await supabase.from('pc').insert({ pc_id, pc_number })
  if (error) {
    console.error('createPc insert error', error)
    throw error
  }

  return await fetchFromViewById(pc_id)
}

/** UPDATE: base table, then re-read view */
export async function updatePc(
  pcId: string,
  patch: Partial<Pick<PcRow, 'pc_number'>>
): Promise<PcRow> {
  const payload: Record<string, any> = {}
  if (patch.pc_number !== undefined) payload.pc_number = String(patch.pc_number ?? '').trim()

  const { error } = await supabase.from('pc').update(payload).eq('pc_id', pcId)
  if (error) {
    console.error('updatePc error', error)
    throw error
  }

  return await fetchFromViewById(pcId)
}
