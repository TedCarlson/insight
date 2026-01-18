// apps/web/src/app/(prod)/pc/PcTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPc, fetchPcs, updatePc } from './pc.api'
import type { CreatePcInput, EditableField, PcInspectorMode, PcRow } from './pc.types'
import PcInspector from './PcInspector'

const WRITE_DELAY_MS = 450

function getId(row: PcRow): string {
  return String(row.pc_id)
}

function getNumber(row: PcRow): string {
  return String(row.pc_number ?? '')
}

export default function PcTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<PcRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<PcInspectorMode>('create')
  const [selectedPcId, setSelectedPcId] = useState<string | null>(null)

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  useEffect(() => {
    let alive = true
    const timers = writeTimers.current
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchPcs()
        if (!alive) return
        setRows(data)
      } catch (err: any) {
        console.error('PC load error', err)
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
    return rows.filter((r) => `${getNumber(r)} ${getId(r)}`.toLowerCase().includes(q))
  }, [rows, search])

  const selectedPc = useMemo(() => {
    if (!selectedPcId) return null
    return rows.find((r) => getId(r) === selectedPcId) ?? null
  }, [rows, selectedPcId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedPcId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: PcRow) {
    setInspectorMode('edit')
    setSelectedPcId(getId(row))
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreatePcInput) {
    const created = await createPc(payload)
    setRows((prev) => [created, ...prev])
  }

  function updateField(pcId: string, field: EditableField, value: any) {
    // optimistic update
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== pcId) return r
        const next: PcRow = { ...(r as any) }
        if (field === 'pc_number') next.pc_number = String(value ?? '')
        return next
      })
    )

    const key = `${pcId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      if ((writeSeq.current.get(key) ?? 0) !== seq) return
      try {
        setError(null)
        const patch = field === 'pc_number' ? { pc_number: String(value ?? '').trim() } : {}
        const updated = await updatePc(pcId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === pcId ? updated : r)))
      } catch (err: any) {
        console.error('PC update error', err)
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
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">PC</div>

          <input
            className="w-72 max-w-[60vw] rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            placeholder="Search by PC number or id…"
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
          + Add PC
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
                <th className="px-3 py-2">PC Number</th>
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
                    <td className="px-3 py-2 font-medium text-[var(--to-ink)]">{getNumber(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{id}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <PcInspector
        open={inspectorOpen}
        mode={inspectorMode}
        pc={inspectorMode === 'edit' ? selectedPc : null}
        onChange={updateField}
        onCreate={onCreate}
        onClose={() => setInspectorOpen(false)}
      />
    </div>
  )
}
