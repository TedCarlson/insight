import { createClient } from '@/app/(prod)/_shared/supabase'
import type { LeadershipRow } from './leadership.types'

const supabase = createClient()

export async function fetchLeadership(): Promise<LeadershipRow[]> {
  const { data, error } = await supabase
    .from('assignment_leadership_admin_v')
    .select('*')
    .order('active', { ascending: false, nullsFirst: false })
    .order('start_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('fetchLeadership error', error)
    throw error
  }

  return (data ?? []) as LeadershipRow[]
}

export async function closeLeadershipEdge(params: {
  assignment_reporting_id: string
  end_date: string // YYYY-MM-DD
}): Promise<void> {
  const { assignment_reporting_id, end_date } = params

  const { error } = await supabase
    .from('assignment_reporting')
    .update({ end_date })
    .eq('assignment_reporting_id', assignment_reporting_id)

  if (error) {
    console.error('closeLeadershipEdge error', error)
    throw error
  }
}

export async function setLeaderForChild(params: {
  child_assignment_id: string
  parent_assignment_id: string
  start_date: string // YYYY-MM-DD
}): Promise<void> {
  const { child_assignment_id, parent_assignment_id, start_date } = params

  // 1) Close any currently-active edge for the child
  const { error: closeErr } = await supabase
    .from('assignment_reporting')
    .update({ end_date: start_date })
    .eq('child_assignment_id', child_assignment_id)
    .is('end_date', null)

  if (closeErr) {
    console.error('setLeaderForChild close step error', closeErr)
    throw closeErr
  }

  // 2) Insert the new active edge
  const { error: insertErr } = await supabase.from('assignment_reporting').insert([
    {
      child_assignment_id,
      parent_assignment_id,
      start_date,
      end_date: null,
    },
  ])

  if (insertErr) {
    console.error('setLeaderForChild insert step error', insertErr)
    throw insertErr
  }
}
