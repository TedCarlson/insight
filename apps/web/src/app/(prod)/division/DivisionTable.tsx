// apps/web/src/app/(prod)/division/DivisionTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createDivision, fetchDivisions, updateDivision } from './division.api'
import type { CreateDivisionInput, DivisionInspectorMode, DivisionRow, EditableField } from './division.types'
import DivisionInspector from './DivisionInspector'

const WRITE_DELAY_MS = 450

function getId(row: DivisionRow): string {
  return String(row.division_id)
}
function getName(row: DivisionRow): string {
  return String(row.division_name ?? '')
}
function getCode(row: DivisionRow): string {
  return String(row.division_code ?? '')
}

export default function DivisionTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<DivisionRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<DivisionInspectorMode>('create')
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null)

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  useEffect(() => {
    let alive = true
    const timers = writeTimers.current
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchDivisions()
        if (!alive) return
        setRows(data)
      } catch (err: any) {
        console.error('Division load error', err)
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
    if (!selectedDivisionId) return null
    return rows.find((r) => getId(r) === selectedDivisionId) ?? null
  }, [rows, selectedDivisionId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedDivisionId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: DivisionRow) {
    setInspectorMode('edit')
    setSelectedDivisionId(getId(row))
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreateDivisionInput) {
    const created = await createDivision(payload)
    setRows((prev) => [created, ...prev])
  }

  function updateField(divisionId: string, field: EditableField, value: any) {
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== divisionId) return r
        const next: DivisionRow = { ...(r as any) }
        if (field === 'division_name') next.division_name = String(value ?? '')
        if (field === 'division_code') next.division_code = String(value ?? '')
        return next
      })
    )

    const key = `${divisionId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      if ((writeSeq.current.get(key) ?? 0) !== seq) return
      try {
        setError(null)
        const patch: any = {}
        if (field === 'division_name') patch.division_name = String(value ?? '').trim()
        if (field === 'division_code') patch.division_code = String(value ?? '').trim()

        const updated = await updateDivision(divisionId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === divisionId ? updated : r)))
      } catch (err: any) {
        console.error('Division update error', err)
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
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">Division</div>

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
          + Add Division
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
                <th className="px-3 py-2">Division Name</th>
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

      <DivisionInspector
        open={inspectorOpen}
        mode={inspectorMode}
        division={inspectorMode === 'edit' ? selected : null}
        onChange={updateField}
        onCreate={onCreate}
        onClose={onCloseInspector}
      />
    </div>
  )
}
