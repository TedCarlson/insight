// apps/web/src/app/(prod)/schedule/ScheduleTable.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import { listSchedules } from './schedule.api'
import type { ScheduleRow } from './schedule.types'

const SEARCH_DEBOUNCE_MS = 300

function safeText(v: any): string {
  return v === null || v === undefined ? '' : String(v)
}

export default function ScheduleTable() {
  const [rows, setRows] = useState<ScheduleRow[]>([])
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize, activeFilter])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const active =
          activeFilter === 'all' ? null : activeFilter === 'active'

        const { rows: nextRows, total: nextTotal } = await listSchedules({
          page,
          pageSize,
          q: debouncedSearch || undefined,
          active,
        })

        if (!alive) return
        setRows(nextRows)
        setTotal(nextTotal)
      } catch (err: unknown) {
        if (!alive) return
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as any).message)
            : 'Failed to load schedules.'
        setError(msg)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [page, pageSize, debouncedSearch, activeFilter])

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeTo = Math.min(page * pageSize, total)
  const canPrev = page > 1
  const canNext = page * pageSize < total

  const emptyState = useMemo(() => !loading && rows.length === 0, [loading, rows])

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">
            Schedule
          </div>

          <input
            className="w-72 max-w-[60vw] rounded border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--to-border)',
              background: 'var(--to-surface)',
              color: 'var(--to-ink)',
            }}
            placeholder="Search schedule, route, fiscal month, id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            className="rounded border px-2 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--to-border)',
              background: 'var(--to-surface)',
              color: 'var(--to-ink)',
            }}
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as any)}
            disabled={loading}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <div className="text-sm text-[var(--to-ink-muted)] flex items-center gap-2">
            <span>
              {rangeFrom}-{rangeTo} of {total}
            </span>

            <button
              className="rounded border px-2 py-1"
              style={{ borderColor: 'var(--to-border)' }}
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <button
              className="rounded border px-2 py-1"
              style={{ borderColor: 'var(--to-border)' }}
              disabled={!canNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>

            <select
              className="rounded border px-2 py-1 text-sm outline-none"
              style={{
                borderColor: 'var(--to-border)',
                background: 'var(--to-surface)',
                color: 'var(--to-ink)',
              }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              disabled={loading}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            <span>{loading ? 'Loading…' : null}</span>
          </div>
        </div>

        <button
          className="rounded px-3 py-2 text-sm font-semibold opacity-60 cursor-not-allowed"
          style={{ background: 'var(--to-cta)', color: 'var(--to-cta-ink)' }}
          title="Planning module not implemented yet"
          disabled
        >
          + Add Schedule
        </button>
      </div>

      {error ? (
        <div className="px-6 pb-3 text-sm" style={{ color: 'var(--to-danger)' }}>
          {error}
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        <div
          className="rounded border overflow-hidden"
          style={{ borderColor: 'var(--to-border)' }}
        >
          <table className="w-full text-sm">
            <thead className="border-b" style={{ borderColor: 'var(--to-border)' }}>
              <tr className="text-left">
                <th className="px-3 py-2">Schedule</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Fiscal Month</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>

            <tbody>
              {emptyState ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--to-ink-muted)]" colSpan={5}>
                    No rows
                  </td>
                </tr>
              ) : null}

              {rows.map((r) => (
                <tr
                  key={safeText(r.schedule_id)}
                  className="border-b last:border-b-0"
                  style={{ borderColor: 'var(--to-border)' }}
                >
                  <td className="px-3 py-2 font-medium text-[var(--to-ink)]">
                    {safeText(r.schedule_name) || '—'}
                    <div className="text-xs text-[var(--to-ink-muted)]">
                      {safeText(r.schedule_id)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[var(--to-ink-muted)]">
                    {safeText(r.route_name) || safeText(r.route_id) || '—'}
                  </td>
                  <td className="px-3 py-2 text-[var(--to-ink-muted)]">
                    {safeText(r.fiscal_month_label) || safeText(r.fiscal_month_id) || '—'}
                  </td>
                  <td className="px-3 py-2 text-[var(--to-ink-muted)]">
                    {r.active === null || r.active === undefined ? '—' : r.active ? 'Yes' : 'No'}
                  </td>
                  <td className="px-3 py-2 text-[var(--to-ink-muted)]">
                    {safeText(r.updated_at) ? safeText(r.updated_at).slice(0, 10) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
