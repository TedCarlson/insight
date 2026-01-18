// apps/web/src/app/(prod)/mso/MsoTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createMso, fetchMsos, updateMso } from './mso.api'
import type { CreateMsoInput, EditableField, MsoInspectorMode, MsoRow } from './mso.types'
import MsoInspector from './MsoInspector'

const WRITE_DELAY_MS = 450

function getId(row: MsoRow): string {
  return String(row.mso_id)
}

function getName(row: MsoRow): string {
  return String(row.mso_name ?? '')
}

export default function MsoTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<MsoRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<MsoInspectorMode>('create')
  const [selectedMsoId, setSelectedMsoId] = useState<string | null>(null)

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  useEffect(() => {
    let alive = true
    const timers = writeTimers.current
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchMsos()
        if (!alive) return
        setRows(data)
      } catch (err: any) {
        console.error('MSO load error', err)
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
    return rows.filter((r) => `${getName(r)} ${getId(r)}`.toLowerCase().includes(q))
  }, [rows, search])

  const selectedMso = useMemo(() => {
    if (!selectedMsoId) return null
    return rows.find((r) => getId(r) === selectedMsoId) ?? null
  }, [rows, selectedMsoId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedMsoId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: MsoRow) {
    setInspectorMode('edit')
    setSelectedMsoId(getId(row))
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreateMsoInput) {
    const created = await createMso(payload)
    setRows((prev) => [created, ...prev])
  }

  function updateField(msoId: string, field: EditableField, value: any) {
    // optimistic update
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== msoId) return r
        const next: MsoRow = { ...(r as any) }
        if (field === 'mso_name') next.mso_name = String(value ?? '')
        return next
      })
    )

    const key = `${msoId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      if ((writeSeq.current.get(key) ?? 0) !== seq) return
      try {
        setError(null)
        const patch = field === 'mso_name' ? { mso_name: String(value ?? '').trim() } : {}
        const updated = await updateMso(msoId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === msoId ? updated : r)))
      } catch (err: any) {
        console.error('MSO update error', err)
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
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">MSO</div>

          <input
            className="w-72 max-w-[60vw] rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            placeholder="Search by name or id…"
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
          + Add MSO
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
                <th className="px-3 py-2">MSO Name</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--to-ink-muted)]" colSpan={2}>
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
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{id}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <MsoInspector
        open={inspectorOpen}
        mode={inspectorMode}
        mso={inspectorMode === 'edit' ? selectedMso : null}
        onChange={updateField}
        onCreate={onCreate}
        onClose={onCloseInspector}
      />
    </div>
  )
}
