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

function logSupabaseError(context: string, err: any) {
  console.error(context, {
    raw: err,
    message: err?.message,
    details: err?.details,
    hint: err?.hint,
    code: err?.code,
    status: err?.status,
    statusText: err?.statusText,
  })
}

function logSupabaseWarn(context: string, err: any) {
  console.warn(context, {
    raw: err,
    message: err?.message,
    details: err?.details,
    hint: err?.hint,
    code: err?.code,
    status: err?.status,
    statusText: err?.statusText,
  })
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
      logSupabaseError(`fetchOptions: ${params.from} error`, res.error)
      throw res.error
    }

    return (res.data ?? []).map(params.map)
  })
}

/**
 * Derive the current user's default pc_org_id using assignment_id.
 *
 * Requirement:
 * - The authenticated user's metadata must include assignment_id:
 *   user.user_metadata.assignment_id OR user.app_metadata.assignment_id
 *
 * Lookup:
 * - assignment_admin_v (assignment_id) -> pc_org_id
 */
export async function fetchDefaultPcOrgIdForCurrentUser(): Promise<string | null> {
  try {
    const userRes = await supabase.auth.getUser()
    const user = userRes.data?.user
    if (!user) return null

    const assignmentId =
      (user.user_metadata as any)?.assignment_id ||
      (user.app_metadata as any)?.assignment_id ||
      null

    if (!assignmentId) {
      // Not an error, just no default available.
      console.warn('fetchDefaultPcOrgIdForCurrentUser: no assignment_id found in auth metadata')
      return null
    }

    const res = await supabase
      .from('assignment_admin_v')
      .select('pc_org_id')
      .eq('assignment_id', String(assignmentId))
      .single()

    if (res.error) {
      logSupabaseWarn('fetchDefaultPcOrgIdForCurrentUser: assignment_admin_v lookup failed', res.error)
      return null
    }

    const pcOrgId = (res.data as any)?.pc_org_id
    return pcOrgId ? String(pcOrgId) : null
  } catch (e) {
    console.warn('fetchDefaultPcOrgIdForCurrentUser: unexpected error', e)
    return null
  }
}

/**
 * Fetch Company + Contractor options for dropdowns
 */
export async function fetchCompanyOptions(): Promise<CompanyOption[]> {
  const [companyRes, contractorRes] = await Promise.all([
    supabase.from('company').select('company_id, company_name, company_code').order('company_name'),
    supabase.from('contractor').select('contractor_id, contractor_name, contractor_code').order('contractor_name'),
  ])

  if (companyRes.error) {
    logSupabaseError('fetchCompanyOptions: company error', companyRes.error)
    throw companyRes.error
  }

  if (contractorRes.error) {
    logSupabaseError('fetchCompanyOptions: contractor error', contractorRes.error)
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
 */
export async function fetchPcOptions(): Promise<DropdownOption[]> {
  return fetchOptions({
    cacheKey: 'pc_admin_v',
    from: 'pc_admin_v',
    select: 'pc_id, pc_number',
    orderBy: 'pc_number',
    map: (p) => ({
      id: p.pc_id,
      label: String(p.pc_number),
    }),
  })
}

/**
 * MSO options (READ from view)
 * view: public.mso_admin_v
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
 * PC Org options
 *
 * Primary: public.pc_org_admin_v
 * Fallback: public.pc_org
 *
 * pc_org_admin_v inventory:
 * pc_org_id, pc_id, mso_id, division_id, region_id, pc_org_name, pc_number, mso_name, division_name, region_name
 */
export async function fetchPcOrgOptions(): Promise<DropdownOption[]> {
  return memoizePromise('pc_org_options', async () => {
    const viewRes = await supabase
      .from('pc_org_admin_v')
      .select(
        [
          'pc_org_id',
          'pc_org_name',
          'pc_number',
          'division_id',
          'division_name',
          'region_id',
          'region_name',
          'pc_id',
          'mso_id',
          'mso_name',
        ].join(', ')
      )
      .order('pc_org_name', { ascending: true })

    if (!viewRes.error) {
      return (viewRes.data ?? []).map((po: any) => ({
        id: po.pc_org_id,
        label: po.pc_org_name,
        meta: {
          pc_org_name: po.pc_org_name,
          pc_number: po.pc_number ?? null,
          division_id: po.division_id ?? null,
          division_name: po.division_name ?? null,
          region_id: po.region_id ?? null,
          region_name: po.region_name ?? null,
          pc_id: po.pc_id ?? null,
          mso_id: po.mso_id ?? null,
          mso_name: po.mso_name ?? null,
        },
      }))
    }

    logSupabaseWarn('fetchPcOrgOptions: pc_org_admin_v failed (fallback to pc_org)', viewRes.error)

    const tblRes = await supabase
      .from('pc_org')
      .select('pc_org_id, pc_org_name')
      .order('pc_org_name', { ascending: true })

    if (tblRes.error) {
      logSupabaseError('fetchPcOrgOptions: pc_org table failed', tblRes.error)
      throw tblRes.error
    }

    return (tblRes.data ?? []).map((po: any) => ({
      id: po.pc_org_id,
      label: po.pc_org_name,
    }))
  })
}

/**
 * Fiscal Month options
 * table: public.fiscal_month_dim
 * Window: current fiscal month + next 3 fiscal months (no look-back).
 */
export async function fetchFiscalMonthOptions(): Promise<DropdownOption[]> {
  return memoizePromise('fiscal_month_dim_current_plus_3', async () => {
    const today = new Date()
    const y = today.getFullYear()
    const m0 = today.getMonth()
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

    const minStart = toDateOnly(anchorYear, anchorMonth0, 22)
    const maxExcl = shiftMonth(anchorYear, anchorMonth0, +4)
    const maxStartExcl = toDateOnly(maxExcl.year, maxExcl.month0, 22)

    const res = await supabase
      .from('fiscal_month_dim')
      .select('fiscal_month_id, label, month_key, start_date, end_date')
      .gte('start_date', minStart)
      .lt('start_date', maxStartExcl)
      .order('start_date', { ascending: true })

    if (res.error) {
      logSupabaseError('fetchFiscalMonthOptions: fiscal_month_dim error', res.error)
      throw res.error
    }

    return (res.data ?? []).map((fm: any) => ({
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
