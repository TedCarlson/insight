// apps/web/src/app/(prod)/region/RegionTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createRegion, deleteRegion, fetchRegions, updateRegion } from './region.api'
import type { CreateRegionInput, EditableField, RegionInspectorMode, RegionRow } from './region.types'
import RegionInspector from './RegionInspector'

const WRITE_DELAY_MS = 450

function getId(row: RegionRow): string {
  const id = row.region_id ?? row.id
  return id ? String(id) : ''
}

function getName(row: RegionRow): string {
  return String(row.region_name ?? row.name ?? '')
}

function getCode(row: RegionRow): string {
  return String(row.region_code ?? row.code ?? '')
}

function getActive(row: RegionRow): boolean {
  const v = row.is_active ?? row.active
  return v === null || v === undefined ? true : Boolean(v)
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
      alive = false
      for (const t of writeTimers.current.values()) clearTimeout(t)
      writeTimers.current.clear()
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = `${getName(r)} ${getCode(r)} ${getId(r)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  const selectedRegion = useMemo(() => {
    if (!selectedRegionId) return null
    return rows.find((r) => getId(r) === selectedRegionId) ?? null
  }, [rows, selectedRegionId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedRegionId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: RegionRow) {
    const id = getId(row)
    if (!id) return
    setInspectorMode('edit')
    setSelectedRegionId(id)
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreateRegionInput) {
    const created = await createRegion(payload)
    setRows((prev) => [created, ...prev])
  }

  async function onDelete(regionId: string) {
    await deleteRegion(regionId)
    setRows((prev) => prev.filter((r) => getId(r) !== regionId))
  }

  function updateField(regionId: string, field: EditableField, value: any) {
    // 1) optimistic
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== regionId) return r
        const next: RegionRow = { ...(r as any) }

        if (field === 'name') {
          next.region_name = String(value ?? '')
          next.name = String(value ?? '')
        } else if (field === 'code') {
          const v = value === '' ? null : String(value ?? '')
          next.region_code = v
          next.code = v
        } else if (field === 'active') {
          next.is_active = Boolean(value)
          next.active = Boolean(value)
        }

        return next
      })
    )

    // 2) debounce write
    const key = `${regionId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      try {
        if ((writeSeq.current.get(key) ?? 0) !== seq) return

        const patch: any = {}
        if (field === 'name') patch.name = String(value ?? '')
        if (field === 'code') patch.code = value === '' ? null : String(value ?? '')
        if (field === 'active') patch.active = Boolean(value)

        const updated = await updateRegion(regionId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === regionId ? updated : r)))
      } catch (err: any) {
        console.error('Debounced region update error', err)
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
        <div className="flex items-center gap-3">
          <input
            placeholder="Search by name, code, id…"
            className="w-96 rounded border px-2 py-1 text-sm bg-white"
            style={{ borderColor: 'var(--to-border)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="text-sm text-[var(--to-ink-muted)]">{loading ? 'Loading…' : `${filtered.length} rows`}</div>
        </div>

        <button
          onClick={openCreate}
          className="rounded px-3 py-2 text-sm font-semibold"
          style={{ background: 'var(--to-cta)', color: 'var(--to-cta-ink)' }}
        >
          + Add Region
        </button>
      </div>

      {error && (
        <div className="px-6 pb-3">
          <div
            className="rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
          >
            <span className="font-semibold">Error:</span> {error}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto px-6 pb-6">
        <div className="rounded border overflow-hidden" style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ borderColor: 'var(--to-border)', background: 'var(--to-header-bg)' }}>
              <tr className="text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Active</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const id = getId(r)
                return (
                  <tr
                    key={id || JSON.stringify(r)}
                    className="border-b hover:bg-black/5 cursor-pointer"
                    style={{ borderColor: 'var(--to-border)' }}
                    onClick={() => openEdit(r)}
                    title="Click to edit"
                  >
                    <td className="px-3 py-2">{getName(r) || <span className="text-[var(--to-ink-muted)]">—</span>}</td>
                    <td className="px-3 py-2">{getCode(r) || <span className="text-[var(--to-ink-muted)]">—</span>}</td>
                    <td className="px-3 py-2">{getActive(r) ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--to-ink-muted)]">{id || '—'}</td>
                  </tr>
                )
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-[var(--to-ink-muted)]" colSpan={4}>
                    No rows match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RegionInspector
        open={inspectorOpen}
        mode={inspectorMode}
        region={inspectorMode === 'edit' ? selectedRegion : null}
        onChange={updateField}
        onCreate={onCreate}
        onDelete={onDelete}
        onClose={onCloseInspector}
      />
    </div>
  )
}
