// apps/web/src/app/(prod)/pc/pc.types.ts

export type PcInspectorMode = 'create' | 'edit'

/**
 * READ shape (view): public.pc_admin_v
 * Columns: pc_id, pc_number
 */
export type PcRow = {
  pc_id: string
  pc_number: string
}

/**
 * WRITE shape (base): public.pc
 * Required: pc_id, pc_number
 */
export type CreatePcInput = {
  pc_id?: string
  pc_number: string
}

export type EditableField = 'pc_number'
