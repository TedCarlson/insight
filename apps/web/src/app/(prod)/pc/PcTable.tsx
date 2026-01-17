// apps/web/src/app/(prod)/pc/PcTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPc, deletePc, fetchPcs, updatePc } from './pc.api'
import type { CreatePcInput, EditableField, PcInspectorMode, PcRow } from './pc.types'
import PcInspector from './PcInspector'

const WRITE_DELAY_MS = 450

function getId(row: PcRow): string {
  const id = row.pc_id ?? row.id
  return id ? String(id) : ''
}

function getName(row: PcRow): string {
  return String(row.pc_name ?? row.name ?? '')
}

function getCode(row: PcRow): string {
  return String(row.pc_code ?? row.code ?? '')
}

function getPcNumber(row: PcRow): string {
  const v = row.pc_number ?? row.number ?? row.pc_no
  return v === null || v === undefined ? '' : String(v)
}

function getActive(row: PcRow): boolean {
  const v = row.is_active ?? row.active
  return v === null || v === undefined ? true : Boolean(v)
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
      alive = false
      for (const t of writeTimers.current.values()) clearTimeout(t)
      writeTimers.current.clear()
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = `${getName(r)} ${getCode(r)} ${getPcNumber(r)} ${getId(r)}`.toLowerCase()
      return hay.includes(q)
    })
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
    const id = getId(row)
    if (!id) return
    setInspectorMode('edit')
    setSelectedPcId(id)
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreatePcInput) {
    const created = await createPc(payload)
    setRows((prev) => [created, ...prev])
  }

  async function onDelete(pcId: string) {
    await deletePc(pcId)
    setRows((prev) => prev.filter((r) => getId(r) !== pcId))
  }

  function updateField(pcId: string, field: EditableField, value: any) {
    // 1) optimistic
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== pcId) return r
        const next: PcRow = { ...(r as any) }

        if (field === 'name') {
          next.pc_name = String(value ?? '')
          next.name = String(value ?? '')
        } else if (field === 'code') {
          const v = value === '' ? null : String(value ?? '')
          next.pc_code = v
          next.code = v
        } else if (field === 'pc_number') {
          const v = value === '' ? null : String(value ?? '')
          next.pc_number = v
          next.number = v
          next.pc_no = v
        } else if (field === 'active') {
          next.is_active = Boolean(value)
          next.active = Boolean(value)
        }

        return next
      })
    )

    // 2) debounce write
    const key = `${pcId}:${field}`
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
        if (field === 'pc_number') patch.pc_number = value === '' ? null : String(value ?? '')
        if (field === 'active') patch.active = Boolean(value)

        const updated = await updatePc(pcId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === pcId ? updated : r)))
      } catch (err: any) {
        console.error('Debounced PC update error', err)
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
            placeholder="Search by name, code, pc#, id…"
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
          + Add PC
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
                <th className="px-3 py-2">PC #</th>
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
                    <td className="px-3 py-2">{getPcNumber(r) || <span className="text-[var(--to-ink-muted)]">—</span>}</td>
                    <td className="px-3 py-2">{getActive(r) ? 'Yes' : 'No'}</td>
                    <td className="px-3 py-2 font-mono text-xs text-[var(--to-ink-muted)]">{id || '—'}</td>
                  </tr>
                )
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-[var(--to-ink-muted)]" colSpan={5}>
                    No rows match your search.
                  </td>
                </tr>
              )}
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
        onDelete={onDelete}
        onClose={onCloseInspector}
      />
    </div>
  )
}
