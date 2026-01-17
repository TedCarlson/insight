// apps/web/src/app/(prod)/route/route.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateRouteInput, RouteRow } from './route.types'

const supabase = createClient()

function pickId(row: any): string {
  const id = row?.route_id ?? row?.id
  if (!id) throw new Error('Could not determine route id from insert/update result.')
  return String(id)
}

async function tryInsertRoute(base: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    { route_name: base.name, route_code: base.code ?? null, is_active: base.active ?? true },
    { name: base.name, code: base.code ?? null, active: base.active ?? true },
    { route_name: base.name, code: base.code ?? null, active: base.active ?? true },
  ]

  let lastErr: any = null
  for (const payload of candidates) {
    const { data, error } = await supabase.from('route').insert(payload).select('*').single()
    if (!error) return data
    lastErr = error
  }

  console.error('tryInsertRoute failed', lastErr)
  throw lastErr
}

async function tryUpdateRoute(routeId: string, patch: Record<string, any>) {
  const candidates: Record<string, any>[] = [
    {
      ...(patch.name !== undefined ? { route_name: patch.name } : {}),
      ...(patch.code !== undefined ? { route_code: patch.code } : {}),
      ...(patch.active !== undefined ? { is_active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
    {
      ...(patch.name !== undefined ? { route_name: patch.name } : {}),
      ...(patch.code !== undefined ? { code: patch.code } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
    },
  ]

  let lastErr: any = null

  for (const payload of candidates) {
    const { error } = await supabase.from('route').update(payload).eq('route_id', routeId)
    if (!error) return
    lastErr = error
  }

  for (const payload of candidates) {
    const { error } = await supabase.from('route').update(payload).eq('id', routeId)
    if (!error) return
    lastErr = error
  }

  console.error('tryUpdateRoute failed', lastErr)
  throw lastErr
}

async function fetchFromViewById(routeId: string): Promise<RouteRow> {
  let { data, error } = await supabase.from('route_admin_v').select('*').eq('route_id', routeId).single()
  if (!error && data) return data as RouteRow

  const res2 = await supabase.from('route_admin_v').select('*').eq('id', routeId).single()
  data = res2.data
  error = res2.error

  if (error) {
    console.error('fetchFromViewById error', error)
    throw error
  }

  return (data ?? {}) as RouteRow
}

/* READ */
export async function fetchRoutes(): Promise<RouteRow[]> {
  const { data, error } = await supabase.from('route_admin_v').select('*').limit(500)
  if (error) {
    console.error('fetchRoutes error', error)
    throw error
  }
  return (data ?? []) as RouteRow[]
}

/* WRITE */
export async function createRoute(payload: CreateRouteInput): Promise<RouteRow> {
  const inserted = await tryInsertRoute(payload)
  const id = pickId(inserted)
  return await fetchFromViewById(id)
}

export async function updateRoute(routeId: string, patch: Partial<CreateRouteInput>): Promise<RouteRow> {
  await tryUpdateRoute(routeId, patch)
  return await fetchFromViewById(routeId)
}

export async function deleteRoute(routeId: string): Promise<void> {
  let { error } = await supabase.from('route').delete().eq('route_id', routeId)
  if (!error) return

  const res2 = await supabase.from('route').delete().eq('id', routeId)
  if (res2.error) {
    console.error('deleteRoute error', res2.error)
    throw res2.error
  }
}
