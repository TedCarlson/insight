// apps/web/src/app/(prod)/route/route.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateRouteInput, RouteRow } from './route.types'

const supabase = createClient()

function newUuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `route_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

async function fetchFromViewById(routeId: string): Promise<RouteRow> {
  const { data, error } = await supabase
    .from('route_admin_v')
    .select('route_id, route_name, mso_id, mso_name')
    .eq('route_id', routeId)
    .single()

  if (error) {
    console.error('fetchFromViewById route error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to fetch route.')
  }

  return data as RouteRow
}

/** READ: view */
export async function fetchRoutes(): Promise<RouteRow[]> {
  const { data, error } = await supabase
    .from('route_admin_v')
    .select('route_id, route_name, mso_id, mso_name')
    .order('route_name')

  if (error) {
    console.error('fetchRoutes error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to load routes.')
  }

  return (data ?? []) as RouteRow[]
}

/** CREATE: base table, then re-read view */
export async function createRoute(input: CreateRouteInput): Promise<RouteRow> {
  const route_id = input.route_id?.trim() || newUuid()
  const route_name = input.route_name.trim()
  const mso_id = input.mso_id.trim()

  if (!route_name) throw new Error('Route name is required.')
  if (!mso_id) throw new Error('MSO is required.')

  const { error } = await supabase.from('route').insert({
    route_id,
    route_name,
    mso_id,
  })

  if (error) {
    console.error('createRoute insert error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Create route failed.')
  }

  return await fetchFromViewById(route_id)
}

/** UPDATE: base table, then re-read view */
export async function updateRoute(
  routeId: string,
  patch: Partial<Pick<RouteRow, 'route_name' | 'mso_id'>>
): Promise<RouteRow> {
  const payload: Record<string, any> = {}
  if (patch.route_name !== undefined) payload.route_name = String(patch.route_name ?? '').trim()
  if (patch.mso_id !== undefined) payload.mso_id = String(patch.mso_id ?? '').trim()

  const { error } = await supabase.from('route').update(payload).eq('route_id', routeId)

  if (error) {
    console.error('updateRoute error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Update route failed.')
  }

  return await fetchFromViewById(routeId)
}
