// apps/web/src/app/(prod)/company/company.types.ts

export type CompanyInspectorMode = 'create' | 'edit'

/**
 * CompanyRow
 * We keep this flexible because the admin view may expose additional columns
 * beyond what we render/edit in the UI.
 */
export type CompanyRow = {
  company_id?: string | null
  id?: string | null

  // common naming candidates
  company_name?: string | null
  name?: string | null

  company_code?: string | null
  code?: string | null

  is_active?: boolean | null
  active?: boolean | null

  created_at?: string | null
  updated_at?: string | null

  [key: string]: any
}

export type CreateCompanyInput = {
  name: string
  code?: string | null
  active?: boolean
}

export type EditableField = 'name' | 'code' | 'active'
