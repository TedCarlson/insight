// apps/web/src/app/(prod)/route/route.api.ts

import { createClient } from '@/app/(prod)/_shared/supabase'
import type { CreateRouteInput, RouteRow } from './route.types'

const supabase = createClient()

/**
 * View reads are "un-typed" via (supabase as any) to avoid GenericStringError issues
 * when views are not present in generated Supabase Database types.
 */

const ROUTE_ADMIN_SELECT = [
  'route_id',
  'route_name',
  'pc_org_id',
  'pc_org_name',
  'mso_id',
  'mso_name',
  // optional context (safe if present in view; ignored if not used by UI)
  'division_id',
  'division_name',
  'division_code',
  'region_id',
  'region_name',
  'region_code',
  'pc_id',
  'pc_number',
].join(', ')

async function fetchFromViewById(routeId: string): Promise<RouteRow> {
  const { data, error } = await (supabase as any)
    .from('route_admin_v')
    .select(ROUTE_ADMIN_SELECT)
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

  return data as unknown as RouteRow
}

/** READ: view */
export async function fetchRoutes(): Promise<RouteRow[]> {
  const { data, error } = await (supabase as any)
    .from('route_admin_v')
    .select(ROUTE_ADMIN_SELECT)
    .order('route_name', { ascending: true })

  if (error) {
    console.error('fetchRoutes error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to load routes.')
  }

  return (data ?? []) as unknown as RouteRow[]
}

/** CREATE: base table, then re-read view */
export async function createRoute(input: CreateRouteInput): Promise<RouteRow> {
  const route_name = String(input.route_name ?? '').trim()
  const pc_org_id = input.pc_org_id ? String(input.pc_org_id).trim() : null

  if (!route_name) throw new Error('Route name is required.')

  const insertPayload: any = {
    route_name,
    pc_org_id,
  }

  // If caller provided route_id, include it (otherwise rely on DB default/uuid)
  if (input.route_id) insertPayload.route_id = String(input.route_id).trim()

  const { data, error } = await supabase.from('route').insert(insertPayload).select('route_id').single()

  if (error) {
    console.error('createRoute insert error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Create route failed.')
  }

  const createdId = String((data as any)?.route_id ?? input.route_id ?? '')
  if (!createdId) throw new Error('Create route succeeded but no route_id returned.')

  return await fetchFromViewById(createdId)
}

/** UPDATE: base table, then re-read view */
export async function updateRoute(
  routeId: string,
  patch: Partial<Pick<RouteRow, 'route_name' | 'pc_org_id'>>
): Promise<RouteRow> {
  const payload: Record<string, any> = {}

  if (patch.route_name !== undefined) payload.route_name = String(patch.route_name ?? '').trim()
  if (patch.pc_org_id !== undefined) payload.pc_org_id = patch.pc_org_id ? String(patch.pc_org_id).trim() : null

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

/* ------------------------------------------------------------------ */
/* LIST (Server pagination/search)                                     */
/* ------------------------------------------------------------------ */

export type ListRoutesParams = {
  page: number
  pageSize: number
  q?: string
}

export async function listRoutes(
  params: ListRoutesParams
): Promise<{ rows: RouteRow[]; total: number }> {
  const page = Math.max(1, params.page || 1)
  const pageSize = Math.max(1, params.pageSize || 25)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = (supabase as any)
    .from('route_admin_v')
    .select(ROUTE_ADMIN_SELECT, { count: 'exact' })
    .order('route_name', { ascending: true })
    .range(from, to)

  const q = (params.q ?? '').trim()
  if (q) {
    const like = `%${q}%`
    query = query.or(
      [
        `route_name.ilike.${like}`,
        `pc_org_name.ilike.${like}`,
        `mso_name.ilike.${like}`,
        `pc_number.ilike.${like}`,
        `route_id.ilike.${like}`,
      ].join(',')
    )
  }

  const { data, count, error } = await query

  if (error) {
    console.error('listRoutes error', {
      message: (error as any)?.message,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
      code: (error as any)?.code,
    })
    throw new Error((error as any)?.message ?? 'Failed to load routes.')
  }

  return {
    rows: (data ?? []) as unknown as RouteRow[],
    total: count ?? 0,
  }
}
