// apps/web/src/app/(prod)/route/route.types.ts

export type RouteInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.route_admin_v
 *
 * Expected columns (subset used by UI):
 * - route_id
 * - route_name
 * - pc_org_id, pc_org_name (new anchor)
 * - mso_id, mso_name (legacy / transition)
 * - optional context: division_code, region_code, pc_number, etc. (may exist)
 */
export type RouteRow = {
  route_id: string
  route_name: string | null

  // New anchor
  pc_org_id: string | null
  pc_org_name: string | null

  // Legacy (still present during transition)
  mso_id: string | null
  mso_name: string | null

  // Optional context (safe to exist or be null/undefined depending on view)
  division_id?: string | null
  division_name?: string | null
  division_code?: string | null

  region_id?: string | null
  region_name?: string | null
  region_code?: string | null

  pc_id?: string | null
  pc_number?: string | null
}

/**
 * WRITE shape (base): public.route
 * Required: route_name
 * Preferred: pc_org_id (will become required once routes are fully backfilled)
 *
 * route_id is optional for create flows (db may default or we can generate client-side)
 */
export type CreateRouteInput = {
  route_id?: string
  route_name: string
  pc_org_id: string | null
}

/** Editable fields the inspector/table can write */
export type EditableField = 'route_name' | 'pc_org_id'
