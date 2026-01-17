// apps/web/src/app/(prod)/pc_org/pc_org.types.ts

export type PcOrgInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.pc_org_admin_v
 * Columns:
 * - pc_org_id, pc_org_name
 * - pc_id, pc_number
 * - division_id, division_name
 * - region_id, region_name
 * - mso_id, mso_name
 */
export type PcOrgRow = {
  pc_org_id: string
  pc_org_name: string

  pc_id: string
  pc_number: number | null

  division_id: string
  division_name: string | null

  region_id: string
  region_name: string | null

  mso_id: string
  mso_name: string | null
}

/**
 * WRITE shape (base): public.pc_org
 * Required:
 * - pc_org_id, pc_org_name, pc_id, division_id, region_id, mso_id
 */
export type CreatePcOrgInput = {
  pc_org_id?: string
  pc_org_name: string
  pc_id: string
  division_id: string
  region_id: string
  mso_id: string
}

export type EditableField = 'pc_org_name' | 'pc_id' | 'division_id' | 'region_id' | 'mso_id'
