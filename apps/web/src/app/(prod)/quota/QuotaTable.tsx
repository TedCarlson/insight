// apps/web/src/app/(prod)/quota/QuotaTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createQuota, fetchQuotas, updateQuota } from './quota.api'
import type { CreateQuotaInput, EditableField, QuotaInspectorMode, QuotaRow } from './quota.types'
import QuotaInspector from './QuotaInspector'

const WRITE_DELAY_MS = 450

function getId(row: QuotaRow): string {
  return String(row.quota_id)
}

function getRouteLabel(row: QuotaRow): string {
  return String(row.route_name ?? '')
}

function getFiscalMonthLabel(row: QuotaRow): string {
  if (row.fiscal_month_label) return String(row.fiscal_month_label)
  if (row.fiscal_month_key) return String(row.fiscal_month_key)
  return ''
}

function getTotalHours(row: QuotaRow): string {
  const v = row.qt_hours
  return v === null || v === undefined ? '' : String(v)
}

function getTotalUnits(row: QuotaRow): string {
  const v = row.qt_units
  return v === null || v === undefined ? '' : String(v)
}

function computeDerivedFromInputs(next: QuotaRow): QuotaRow {
  const qh_sun = Number(next.qh_sun ?? 0)
  const qh_mon = Number(next.qh_mon ?? 0)
  const qh_tue = Number(next.qh_tue ?? 0)
  const qh_wed = Number(next.qh_wed ?? 0)
  const qh_thu = Number(next.qh_thu ?? 0)
  const qh_fri = Number(next.qh_fri ?? 0)
  const qh_sat = Number(next.qh_sat ?? 0)

  const totalHours = qh_sun + qh_mon + qh_tue + qh_wed + qh_thu + qh_fri + qh_sat
  const totalUnits = totalHours * 12

  // keep UI responsive while DB recomputes (DB remains source of truth)
  next.qu_sun = qh_sun * 12
  next.qu_mon = qh_mon * 12
  next.qu_tue = qh_tue * 12
  next.qu_wed = qh_wed * 12
  next.qu_thu = qh_thu * 12
  next.qu_fri = qh_fri * 12
  next.qu_sat = qh_sat * 12

  next.qt_hours = totalHours
  next.qt_units = totalUnits

  return next
}

export default function QuotaTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<QuotaRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<QuotaInspectorMode>('create')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchQuotas()
        if (!alive) return
        setRows(data)
      } catch (err: any) {
        console.error('Quota load error', err)
        if (!alive) return
        setError(err?.message ?? 'Failed to load.')
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return rows.find((r) => getId(r) === selectedId) ?? null
  }, [rows, selectedId])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter((r) => {
      const id = getId(r).toLowerCase()
      const route = getRouteLabel(r).toLowerCase()
      const fm = getFiscalMonthLabel(r).toLowerCase()
      const fmKey = String(r.fiscal_month_key ?? '').toLowerCase()

      const hours = getTotalHours(r).toLowerCase()
      const units = getTotalUnits(r).toLowerCase()

      return (
        id.includes(q) ||
        route.includes(q) ||
        fm.includes(q) ||
        fmKey.includes(q) ||
        hours.includes(q) ||
        units.includes(q)
      )
    })
  }, [rows, search])

  function openCreate() {
    setInspectorMode('create')
    setInspectorOpen(true)
  }

  function openEdit(row: QuotaRow) {
    setSelectedId(getId(row))
    setInspectorMode('edit')
    setInspectorOpen(true)
  }

  function closeInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreateQuotaInput) {
    const created = await createQuota(payload)
    setRows((prev) => [created, ...prev])
  }

  function updateField(quotaId: string, field: EditableField, value: any) {
    // optimistic update (fast UI)
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== quotaId) return r
        const next: QuotaRow = { ...(r as any) }

        if (field === 'route_id') next.route_id = String(value ?? '')
        if (field === 'fiscal_month_id') next.fiscal_month_id = String(value ?? '')

        if (field === 'qh_sun') next.qh_sun = Number(value ?? 0)
        if (field === 'qh_mon') next.qh_mon = Number(value ?? 0)
        if (field === 'qh_tue') next.qh_tue = Number(value ?? 0)
        if (field === 'qh_wed') next.qh_wed = Number(value ?? 0)
        if (field === 'qh_thu') next.qh_thu = Number(value ?? 0)
        if (field === 'qh_fri') next.qh_fri = Number(value ?? 0)
        if (field === 'qh_sat') next.qh_sat = Number(value ?? 0)

        // Keep totals responsive when day-hours change
        if (field.startsWith('qh_')) return computeDerivedFromInputs(next)

        return next
      })
    )

    const key = `${quotaId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      if ((writeSeq.current.get(key) ?? 0) !== seq) return
      try {
        setError(null)
        const patch: any = {}

        if (field === 'route_id') patch.route_id = String(value ?? '').trim()
        if (field === 'fiscal_month_id') patch.fiscal_month_id = String(value ?? '').trim()

        if (field === 'qh_sun') patch.qh_sun = Number(value ?? 0)
        if (field === 'qh_mon') patch.qh_mon = Number(value ?? 0)
        if (field === 'qh_tue') patch.qh_tue = Number(value ?? 0)
        if (field === 'qh_wed') patch.qh_wed = Number(value ?? 0)
        if (field === 'qh_thu') patch.qh_thu = Number(value ?? 0)
        if (field === 'qh_fri') patch.qh_fri = Number(value ?? 0)
        if (field === 'qh_sat') patch.qh_sat = Number(value ?? 0)

        const updated = await updateQuota(quotaId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === quotaId ? updated : r)))
      } catch (err: any) {
        console.error('Quota update error', err)
        setError(err?.message ?? 'Update failed.')
      } finally {
        writeTimers.current.delete(key)
      }
    }, WRITE_DELAY_MS)

    writeTimers.current.set(key, timer)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">Quota</div>

          <input
            className="w-72 max-w-[60vw] rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            placeholder="Search fiscal month, route, totals, or id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="text-sm text-[var(--to-ink-muted)]">
            {loading ? 'Loading…' : `${filtered.length} rows`}
          </div>
        </div>

        <button
          onClick={openCreate}
          className="rounded px-3 py-2 text-sm font-semibold"
          style={{ background: 'var(--to-cta)', color: 'var(--to-cta-ink)' }}
        >
          + Add Quota
        </button>
      </div>

      {error ? (
        <div className="px-6 pb-3 text-sm" style={{ color: 'var(--to-danger)' }}>
          {error}
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--to-border)' }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ borderColor: 'var(--to-border)' }}>
              <tr className="text-left">
                <th className="px-3 py-2">Fiscal Month</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Total Hours</th>
                <th className="px-3 py-2">Total Units</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--to-ink-muted)]" colSpan={5}>
                    No rows
                  </td>
                </tr>
              ) : null}

              {filtered.map((r) => {
                const id = getId(r)
                return (
                  <tr
                    key={id}
                    className="border-b last:border-b-0 cursor-pointer hover:opacity-90"
                    style={{ borderColor: 'var(--to-border)' }}
                    onClick={() => openEdit(r)}
                    title="Click to edit"
                  >
                    <td className="px-3 py-2 font-medium text-[var(--to-ink)]">{getFiscalMonthLabel(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getRouteLabel(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getTotalHours(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getTotalUnits(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{id}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <QuotaInspector
        open={inspectorOpen}
        mode={inspectorMode}
        quota={inspectorMode === 'edit' ? selected : null}
        onChange={updateField}
        onCreate={onCreate}
        onClose={closeInspector}
      />
    </div>
  )
}
