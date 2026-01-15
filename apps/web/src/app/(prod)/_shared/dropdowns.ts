// apps/web/src/app/(prod)/_shared/dropdowns.ts

import { createClient } from './supabase'

const supabase = createClient()

/**
 * Normalized dropdown option for Company / Contractor selector
 */
export interface CompanyOption {
  id: string
  label: string
  code: string | null
  source_type: 'company' | 'contractor'
}

/**
 * Fetch Company + Contractor options for dropdowns
 * Used by:
 * - Person editor
 * - Future assignment / admin flows
 */
export async function fetchCompanyOptions(): Promise<CompanyOption[]> {
  const [companyRes, contractorRes] = await Promise.all([
    supabase
      .from('company')
      .select('company_id, company_name, company_code')
      .order('company_name'),

    supabase
      .from('contractor')
      .select('contractor_id, contractor_name, contractor_code')
      .order('contractor_name'),
  ])

  if (companyRes.error) {
    console.error('fetchCompanyOptions: company error', companyRes.error)
    throw companyRes.error
  }

  if (contractorRes.error) {
    console.error('fetchCompanyOptions: contractor error', contractorRes.error)
    throw contractorRes.error
  }

  const companies: CompanyOption[] =
    companyRes.data?.map((c) => ({
      id: c.company_id,
      label: c.company_name,
      code: c.company_code ?? null,
      source_type: 'company',
    })) ?? []

  const contractors: CompanyOption[] =
    contractorRes.data?.map((k) => ({
      id: k.contractor_id,
      label: k.contractor_name,
      code: k.contractor_code ?? null,
      source_type: 'contractor',
    })) ?? []

  return [...companies, ...contractors]
}
