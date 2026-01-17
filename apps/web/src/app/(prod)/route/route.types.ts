// apps/web/src/app/(prod)/route/route.types.ts

export type RouteInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.route_admin_v
 * Columns: route_id, route_name, mso_id, mso_name
 */
export type RouteRow = {
  route_id: string
  route_name: string
  mso_id: string
  mso_name: string
}

/**
 * WRITE shape (base): public.route
 * Required: route_id, route_name, mso_id
 */
export type CreateRouteInput = {
  route_id?: string
  route_name: string
  mso_id: string
}

export type EditableField = 'route_name' | 'mso_id'
