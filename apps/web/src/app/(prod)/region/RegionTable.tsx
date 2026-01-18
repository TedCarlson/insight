// apps/web/src/app/(prod)/region/RegionTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createRegion, fetchRegions, updateRegion } from './region.api'
import type { CreateRegionInput, EditableField, RegionInspectorMode, RegionRow } from './region.types'
import RegionInspector from './RegionInspector'

const WRITE_DELAY_MS = 450

function getId(row: RegionRow): string {
  return String(row.region_id)
}
function getName(row: RegionRow): string {
  return String(row.region_name ?? '')
}
function getCode(row: RegionRow): string {
  return String(row.region_code ?? '')
}

export default function RegionTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<RegionRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<RegionInspectorMode>('create')
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null)

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  useEffect(() => {
    let alive = true
    const timers = writeTimers.current
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchRegions()
        if (!alive) return
        setRows(data)
      } catch (err: any) {
        console.error('Region load error', err)
        if (!alive) return
        setError(err?.message ?? 'Failed to load.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
  for (const t of timers.values()) clearTimeout(t)
  timers.clear()
}
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => `${getName(r)} ${getCode(r)} ${getId(r)}`.toLowerCase().includes(q))
  }, [rows, search])

  const selected = useMemo(() => {
    if (!selectedRegionId) return null
    return rows.find((r) => getId(r) === selectedRegionId) ?? null
  }, [rows, selectedRegionId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedRegionId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: RegionRow) {
    setInspectorMode('edit')
    setSelectedRegionId(getId(row))
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreateRegionInput) {
    const created = await createRegion(payload)
    setRows((prev) => [created, ...prev])
  }

  function updateField(regionId: string, field: EditableField, value: any) {
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== regionId) return r
        const next: RegionRow = { ...(r as any) }
        if (field === 'region_name') next.region_name = String(value ?? '')
        if (field === 'region_code') next.region_code = String(value ?? '')
        return next
      })
    )

    const key = `${regionId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      if ((writeSeq.current.get(key) ?? 0) !== seq) return
      try {
        setError(null)
        const patch: any = {}
        if (field === 'region_name') patch.region_name = String(value ?? '').trim()
        if (field === 'region_code') patch.region_code = String(value ?? '').trim()

        const updated = await updateRegion(regionId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === regionId ? updated : r)))
      } catch (err: any) {
        console.error('Region update error', err)
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
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">Region</div>

          <input
            className="w-72 max-w-[60vw] rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            placeholder="Search by name, code, or id…"
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
          + Add Region
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
                <th className="px-3 py-2">Region Name</th>
                <th className="px-3 py-2">Code</th>
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
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getCode(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{id}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RegionInspector
        open={inspectorOpen}
        mode={inspectorMode}
        region={inspectorMode === 'edit' ? selected : null}
        onChange={updateField}
        onCreate={onCreate}
        onClose={onCloseInspector}
      />
    </div>
  )
}
