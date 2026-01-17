// apps/web/src/app/(prod)/_shared/dropdowns.ts

import { createClient } from './supabase'

const supabase = createClient()

/**
 * Generic normalized dropdown option for simple selectors
 * (Division / Region / PC / MSO / Route / etc.)
 */
export interface DropdownOption {
  id: string
  label: string
  code?: string | null
  meta?: Record<string, unknown>
}

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
 * Tiny in-memory memoizer to reduce duplicate fetches during a single runtime session.
 * Safe for client-side usage; for server-side this just dedupes within the same process.
 */
const _promiseCache = new Map<string, Promise<unknown>>()

function memoizePromise<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (_promiseCache.has(key)) return _promiseCache.get(key) as Promise<T>
  const p = fn()
  _promiseCache.set(key, p)
  return p
}

/**
 * Internal helper to fetch normalized options from any table/view.
 */
async function fetchOptions(params: {
  cacheKey: string
  from: string
  select: string
  orderBy: string
  map: (row: any) => DropdownOption
}): Promise<DropdownOption[]> {
  return memoizePromise(params.cacheKey, async () => {
    const res = await supabase
      .from(params.from)
      .select(params.select)
      .order(params.orderBy)

    if (res.error) {
      console.error(`fetchOptions: ${params.from} error`, res.error)
      throw res.error
    }

    return (res.data ?? []).map(params.map)
  })
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


/**
 * Division options (READ from view)
 * view: public.division_admin_v
 * cols: division_id, division_name, division_code
 */
export async function fetchDivisionOptions(): Promise<DropdownOption[]> {
  return fetchOptions({
    cacheKey: 'division_admin_v',
    from: 'division_admin_v',
    select: 'division_id, division_name, division_code',
    orderBy: 'division_name',
    map: (d) => ({
      id: d.division_id,
      label: d.division_name,
      code: d.division_code ?? null,
    }),
  })
}

/**
 * Region options (READ from view)
 * view: public.region_admin_v
 * cols: region_id, region_name, region_code
 */
export async function fetchRegionOptions(): Promise<DropdownOption[]> {
  return fetchOptions({
    cacheKey: 'region_admin_v',
    from: 'region_admin_v',
    select: 'region_id, region_name, region_code',
    orderBy: 'region_name',
    map: (r) => ({
      id: r.region_id,
      label: r.region_name,
      code: r.region_code ?? null,
    }),
  })
}

/**
 * PC options (READ from view)
 * view: public.pc_admin_v
 * cols: pc_id, pc_number
 */
export async function fetchPcOptions(): Promise<DropdownOption[]> {
  return fetchOptions({
    cacheKey: 'pc_admin_v',
    from: 'pc_admin_v',
    select: 'pc_id, pc_number',
    orderBy: 'pc_number',
    map: (p) => ({
      id: p.pc_id,
      label: p.pc_number,
    }),
  })
}

/**
 * MSO options (READ from view)
 * view: public.mso_admin_v
 * cols: mso_id, mso_name
 */
export async function fetchMsoOptions(): Promise<DropdownOption[]> {
  return fetchOptions({
    cacheKey: 'mso_admin_v',
    from: 'mso_admin_v',
    select: 'mso_id, mso_name',
    orderBy: 'mso_name',
    map: (m) => ({
      id: m.mso_id,
      label: m.mso_name,
    }),
  })
}

/**
 * Route options (READ from view)
 * view: public.route_admin_v
 * cols: route_id, route_name, mso_id, mso_name
 *
 * Label includes MSO name to make Quota route selection unambiguous.
 */
export async function fetchRouteOptions(): Promise<DropdownOption[]> {
  return fetchOptions({
    cacheKey: 'route_admin_v',
    from: 'route_admin_v',
    select: 'route_id, route_name, mso_id, mso_name',
    orderBy: 'route_name',
    map: (r) => ({
      id: r.route_id,
      label: r.mso_name ? `${r.route_name} — ${r.mso_name}` : r.route_name,
      meta: {
        route_name: r.route_name,
        mso_id: r.mso_id,
        mso_name: r.mso_name,
      },
    }),
  })
}
