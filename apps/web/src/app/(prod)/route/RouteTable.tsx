// apps/web/src/app/(prod)/route/RouteTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoute, listRoutes, updateRoute } from './route.api'
import type {
  CreateRouteInput,
  EditableField,
  RouteInspectorMode,
  RouteRow,
} from './route.types'
import RouteInspector from './RouteInspector'

const WRITE_DELAY_MS = 450
const SEARCH_DEBOUNCE_MS = 300

function getId(row: RouteRow): string {
  return String(row.route_id)
}

function getRouteName(row: RouteRow): string {
  return String(row.route_name ?? '')
}

function safeText(v: any): string {
  return v === null || v === undefined ? '' : String(v)
}

export default function RouteTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<RouteRow[]>([])
  const [total, setTotal] = useState(0)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [reloadKey, setReloadKey] = useState(0)

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] =
    useState<RouteInspectorMode>('create')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  // Debounce search → server query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 when search/pageSize changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize])

  // Load paged routes
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const { rows: nextRows, total: nextTotal } = await listRoutes({
          page,
          pageSize,
          q: debouncedSearch || undefined,
        })

        if (!alive) return
        setRows(nextRows)
        setTotal(nextTotal)
      } catch (err: unknown) {
        console.error('Route load error', err)
        if (!alive) return
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as any).message)
            : 'Failed to load routes.'
        setError(msg)
      } finally {
        if (!alive) return
        setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [page, pageSize, debouncedSearch, reloadKey])

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = writeTimers.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
    }
  }, [])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return rows.find((r) => getId(r) === selectedId) ?? null
  }, [rows, selectedId])

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeTo = Math.min(page * pageSize, total)
  const canPrev = page > 1
  const canNext = page * pageSize < total

  function openCreate() {
    setInspectorMode('create')
    setInspectorOpen(true)
  }

  function openEdit(row: RouteRow) {
    setSelectedId(getId(row))
    setInspectorMode('edit')
    setInspectorOpen(true)
  }

  function closeInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreateRouteInput) {
    await createRoute(payload)
    // Refresh authoritative ordering from server
    setPage(1)
    setReloadKey((k) => k + 1)
  }

  function updateField(routeId: string, field: EditableField, value: any) {
    // optimistic update
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== routeId) return r
        const next: RouteRow = { ...(r as any) }
        if (field === 'route_name') next.route_name = String(value ?? '')
        if (field === 'pc_org_id') next.pc_org_id = value ? String(value) : null
        return next
      })
    )

    const key = `${routeId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      if ((writeSeq.current.get(key) ?? 0) !== seq) return
      try {
        setError(null)
        const patch: any = {}

        if (field === 'route_name') patch.route_name = String(value ?? '').trim()
        if (field === 'pc_org_id')
          patch.pc_org_id = value ? String(value).trim() : null

        const updated = await updateRoute(routeId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === routeId ? updated : r)))
      } catch (err: unknown) {
        console.error('Route update error', err)
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as any).message)
            : 'Update failed.'
        setError(msg)
      } finally {
        writeTimers.current.delete(key)
      }
    }, WRITE_DELAY_MS)

    writeTimers.current.set(key, timer)
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-4 min-w-0">
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">
            Route
          </div>

          <input
            className="w-72 max-w-[60vw] rounded border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--to-border)',
              background: 'var(--to-surface)',
              color: 'var(--to-ink)',
            }}
            placeholder="Search route, PC org, division, region…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

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
          onClick={openCreate}
          className="rounded px-3 py-2 text-sm font-semibold"
          style={{ background: 'var(--to-cta)', color: 'var(--to-cta-ink)' }}
        >
          + Add Route
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
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">PC Org</th>
                <th className="px-3 py-2">Division</th>
                <th className="px-3 py-2">Region</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--to-ink-muted)]" colSpan={4}>
                    No rows
                  </td>
                </tr>
              ) : null}

              {rows.map((r) => {
                const id = getId(r)
                return (
                  <tr
                    key={id}
                    className="border-b last:border-b-0 cursor-pointer hover:opacity-90"
                    style={{ borderColor: 'var(--to-border)' }}
                    onClick={() => openEdit(r)}
                    title="Click to edit"
                  >
                    <td className="px-3 py-2 font-medium text-[var(--to-ink)]">
                      {getRouteName(r)}
                    </td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">
                      {safeText(r.pc_org_name) || '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">
                      {safeText(r.division_name) || '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">
                      {safeText(r.region_name) || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RouteInspector
        open={inspectorOpen}
        mode={inspectorMode}
        route={inspectorMode === 'edit' ? selected : null}
        onChange={updateField}
        onCreate={onCreate}
        onClose={closeInspector}
      />
    </div>
  )
}
