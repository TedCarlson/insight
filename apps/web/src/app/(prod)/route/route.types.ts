// apps/web/src/app/(prod)/route/route.types.ts

export type RouteInspectorMode = 'create' | 'edit'

export type RouteRow = {
  route_id?: string | null
  id?: string | null

  route_name?: string | null
  name?: string | null

  route_code?: string | null
  code?: string | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreateRouteInput = {
  name: string
  code?: string | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'active'
