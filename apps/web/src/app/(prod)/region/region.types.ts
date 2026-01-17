// apps/web/src/app/(prod)/region/region.types.ts

export type RegionInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.region_admin_v
 * Columns: region_id, region_name, region_code
 */
export type RegionRow = {
  region_id: string
  region_name: string
  region_code: string
}

/**
 * WRITE shape (base): public.region
 * Required: region_id, region_name, region_code
 */
export type CreateRegionInput = {
  region_id?: string
  region_name: string
  region_code: string
}

export type EditableField = 'region_name' | 'region_code'
