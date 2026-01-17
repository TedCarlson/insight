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
  ascending?: boolean
  map: (row: any) => DropdownOption
}): Promise<DropdownOption[]> {
  return memoizePromise(params.cacheKey, async () => {
    const res = await supabase
      .from(params.from)
      .select(params.select)
      .order(params.orderBy, { ascending: params.ascending ?? true })

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
    supabase.from('company').select('company_id, company_name, company_code').order('company_name'),

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
 * PC Org options (READ from view)
 * view: public.pc_org_admin_v
 * cols (expected): pc_org_id, pc_org_name
 *
 * Used by:
 * - Route editor (pc_org_id is the new anchor)
 * - Future ops planning / reporting anchors
 */
export async function fetchPcOrgOptions(): Promise<DropdownOption[]> {
  return fetchOptions({
    cacheKey: 'pc_org_admin_v',
    from: 'pc_org_admin_v',
    select: 'pc_org_id, pc_org_name, division_code, region_code, pc_number, mso_name',
    orderBy: 'pc_org_name',
    map: (po) => ({
      id: po.pc_org_id,
      label: po.pc_org_name,
      meta: {
        pc_org_name: po.pc_org_name,
        division_code: po.division_code ?? null,
        region_code: po.region_code ?? null,
        pc_number: po.pc_number ?? null,
        mso_name: po.mso_name ?? null,
      },
    }),
  })
}

/**
 * Fiscal Month options (READ from table)
 * table: public.fiscal_month_dim
 * cols: fiscal_month_id, label, month_key, start_date, end_date
 *
 * Window: current fiscal month + next 3 fiscal months (no look-back).
 * Label convention: "FY2026 January"
 */
export async function fetchFiscalMonthOptions(): Promise<DropdownOption[]> {
  return memoizePromise('fiscal_month_dim_current_plus_3', async () => {
    // Compute current fiscal month start anchor (22nd rule)
    const today = new Date()
    const y = today.getFullYear()
    const m0 = today.getMonth() // 0-based
    const d = today.getDate()

    let anchorYear = y
    let anchorMonth0 = m0
    if (d < 22) {
      anchorMonth0 = m0 - 1
      if (anchorMonth0 < 0) {
        anchorMonth0 = 11
        anchorYear = y - 1
      }
    }

    const toDateOnly = (year: number, month0: number, day: number) => {
      const mm = String(month0 + 1).padStart(2, '0')
      const dd = String(day).padStart(2, '0')
      return `${year}-${mm}-${dd}`
    }

    const shiftMonth = (year: number, month0: number, deltaMonths: number) => {
      const total = year * 12 + month0 + deltaMonths
      const ny = Math.floor(total / 12)
      const nm0 = total % 12
      return { year: ny, month0: nm0 }
    }

    // current anchor start_date
    const minStart = toDateOnly(anchorYear, anchorMonth0, 22)

    // exclusive upper bound: anchor + 4 months => returns 4 items: current + 3
    const maxExcl = shiftMonth(anchorYear, anchorMonth0, +4)
    const maxStartExcl = toDateOnly(maxExcl.year, maxExcl.month0, 22)

    const res = await supabase
      .from('fiscal_month_dim')
      .select('fiscal_month_id, label, month_key, start_date, end_date')
      .gte('start_date', minStart)
      .lt('start_date', maxStartExcl)
      .order('start_date', { ascending: true })

    if (res.error) {
      console.error('fetchFiscalMonthOptions: fiscal_month_dim error', res.error)
      throw res.error
    }

    return (res.data ?? []).map((fm) => ({
      id: fm.fiscal_month_id,
      label: fm.label,
      code: fm.month_key ?? null,
      meta: {
        month_key: fm.month_key ?? null,
        start_date: fm.start_date ?? null,
        end_date: fm.end_date ?? null,
      },
    }))
  })
}

/**
 * Route options (READ from view)
 * view: public.route_admin_v
 * cols (expected): route_id, route_name, pc_org_id, pc_org_name, mso_id, mso_name
 *
 * Label priority:
 * 1) Route — PC Org (preferred)
 * 2) Route — MSO (legacy fallback)
 * 3) Route
 */
export async function fetchRouteOptions(): Promise<DropdownOption[]> {
  return fetchOptions({
    cacheKey: 'route_admin_v',
    from: 'route_admin_v',
    select: 'route_id, route_name, pc_org_id, pc_org_name, mso_id, mso_name',
    orderBy: 'route_name',
    map: (r) => {
      const label = r.pc_org_name
        ? `${r.route_name} — ${r.pc_org_name}`
        : r.mso_name
          ? `${r.route_name} — ${r.mso_name}`
          : r.route_name

      return {
        id: r.route_id,
        label,
        meta: {
          route_name: r.route_name,
          pc_org_id: r.pc_org_id ?? null,
          pc_org_name: r.pc_org_name ?? null,
          mso_id: r.mso_id ?? null,
          mso_name: r.mso_name ?? null,
        },
      }
    },
  })
}
