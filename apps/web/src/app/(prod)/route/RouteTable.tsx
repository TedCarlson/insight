// apps/web/src/app/(prod)/route/RouteTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoute, fetchRoutes, updateRoute } from './route.api'
import type { CreateRouteInput, EditableField, RouteInspectorMode, RouteRow } from './route.types'
import RouteInspector from './RouteInspector'

const WRITE_DELAY_MS = 450

function getId(row: RouteRow): string {
  return String(row.route_id)
}
function getName(row: RouteRow): string {
  return String(row.route_name ?? '')
}
function getMsoName(row: RouteRow): string {
  return String(row.mso_name ?? '')
}

export default function RouteTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<RouteRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<RouteInspectorMode>('create')
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null)

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchRoutes()
        if (!alive) return
        setRows(data)
      } catch (err: any) {
        console.error('Route load error', err)
        if (!alive) return
        setError(err?.message ?? 'Failed to load.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
      for (const t of writeTimers.current.values()) clearTimeout(t)
      writeTimers.current.clear()
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => `${getName(r)} ${getMsoName(r)} ${getId(r)}`.toLowerCase().includes(q))
  }, [rows, search])

  const selected = useMemo(() => {
    if (!selectedRouteId) return null
    return rows.find((r) => getId(r) === selectedRouteId) ?? null
  }, [rows, selectedRouteId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedRouteId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: RouteRow) {
    setInspectorMode('edit')
    setSelectedRouteId(getId(row))
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreateRouteInput) {
    const created = await createRoute(payload)
    setRows((prev) => [created, ...prev])
  }

  function updateField(routeId: string, field: EditableField, value: any) {
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== routeId) return r
        const next: RouteRow = { ...(r as any) }
        if (field === 'route_name') next.route_name = String(value ?? '')
        if (field === 'mso_id') next.mso_id = String(value ?? '')
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
        if (field === 'mso_id') patch.mso_id = String(value ?? '').trim()

        const updated = await updateRoute(routeId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === routeId ? updated : r)))
      } catch (err: any) {
        console.error('Route update error', err)
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
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">Route</div>

          <input
            className="w-72 max-w-[60vw] rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            placeholder="Search by route, MSO, or id…"
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
          + Add Route
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
                <th className="px-3 py-2">Route Name</th>
                <th className="px-3 py-2">MSO</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--to-ink-muted)]" colSpan={3}>
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
                    <td className="px-3 py-2 font-medium text-[var(--to-ink)]">{getName(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getMsoName(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{id}</td>
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
        onClose={onCloseInspector}
      />
    </div>
  )
}
