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
function getRoute(row: QuotaRow): string {
  return String(row.route_name ?? '')
}
function getUnits(row: QuotaRow): string {
  const v = row.q_units
  return v === null || v === undefined ? '' : String(v)
}
function getHours(row: QuotaRow): string {
  const v = row.q_hours
  return v === null || v === undefined ? '' : String(v)
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
    return rows.filter((r) => {
      const hay = `${getRoute(r)} ${getUnits(r)} ${getHours(r)} ${getId(r)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  const selected = useMemo(() => {
    if (!selectedId) return null
    return rows.find((r) => getId(r) === selectedId) ?? null
  }, [rows, selectedId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: QuotaRow) {
    setInspectorMode('edit')
    setSelectedId(getId(row))
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
    // optimistic
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== quotaId) return r
        const next: QuotaRow = { ...(r as any) }
        if (field === 'route_id') next.route_id = String(value ?? '')
        if (field === 'q_units') next.q_units = value as number | null
        if (field === 'q_hours') next.q_hours = value as number | null
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
        if (field === 'q_units') patch.q_units = value
        if (field === 'q_hours') patch.q_hours = value

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
            placeholder="Search route, units, hours, or id…"
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
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Units</th>
                <th className="px-3 py-2">Hours</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--to-ink-muted)]" colSpan={4}>
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
                    <td className="px-3 py-2 font-medium text-[var(--to-ink)]">{getRoute(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getUnits(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getHours(r)}</td>
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
