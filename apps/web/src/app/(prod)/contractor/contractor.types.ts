// apps/web/src/app/(prod)/contractor/contractor.types.ts

export type ContractorInspectorMode = 'create' | 'edit'

/**
 * Flexible row contract because views can differ by environment.
 */
export type ContractorRow = {
  contractor_id?: string | null
  id?: string | null

  contractor_name?: string | null
  name?: string | null

  contractor_code?: string | null
  code?: string | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreateContractorInput = {
  name: string
  code?: string | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'active'
