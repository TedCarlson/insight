// apps/web/src/app/(prod)/region/region.types.ts

export type RegionInspectorMode = 'create' | 'edit'

export type RegionRow = {
  region_id?: string | null
  id?: string | null

  region_name?: string | null
  name?: string | null

  region_code?: string | null
  code?: string | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreateRegionInput = {
  name: string
  code?: string | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'active'
