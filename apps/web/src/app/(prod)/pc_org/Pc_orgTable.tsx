// apps/web/src/app/(prod)/pc_org/Pc_orgTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPcOrg, deletePcOrg, fetchPcOrgs, updatePcOrg } from './pc_org.api'
import type { CreatePcOrgInput, EditableField, PcOrgInspectorMode, PcOrgRow } from './pc_org.types'
import Pc_orgInspector from './Pc_orgInspector'

const WRITE_DELAY_MS = 450

function getId(row: PcOrgRow): string {
  const id = row.pc_org_id ?? row.id
  return id ? String(id) : ''
}

function getName(row: PcOrgRow): string {
  return String(row.pc_org_name ?? row.name ?? '')
}

function getCode(row: PcOrgRow): string {
  return String(row.pc_org_code ?? row.code ?? '')
}

function getPcNumber(row: PcOrgRow): string {
  const v = row.pc_number ?? row.pc_no ?? row.number
  return v === null || v === undefined ? '' : String(v)
}

function getActive(row: PcOrgRow): boolean {
  const v = row.is_active ?? row.active
  return v === null || v === undefined ? true : Boolean(v)
}

export default function Pc_orgTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<PcOrgRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<PcOrgInspectorMode>('create')
  const [selectedPcOrgId, setSelectedPcOrgId] = useState<string | null>(null)

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchPcOrgs()
        if (!alive) return
        setRows(data)
      } catch (err: any) {
        console.error('PC Org load error', err)
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

  const selectedPcOrg = useMemo(() => {
    if (!selectedPcOrgId) return null
    return rows.find((r) => getId(r) === selectedPcOrgId) ?? null
  }, [rows, selectedPcOrgId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedPcOrgId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: PcOrgRow) {
    const id = getId(row)
    if (!id) return
    setInspectorMode('edit')
    setSelectedPcOrgId(id)
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreatePcOrgInput) {
    const created = await createPcOrg(payload)
    setRows((prev) => [created, ...prev])
  }

  async function onDelete(pcOrgId: string) {
    await deletePcOrg(pcOrgId)
    setRows((prev) => prev.filter((r) => getId(r) !== pcOrgId))
  }

  function updateField(pcOrgId: string, field: EditableField, value: any) {
    // 1) optimistic
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== pcOrgId) return r
        const next: PcOrgRow = { ...(r as any) }

        if (field === 'name') {
          next.pc_org_name = String(value ?? '')
          next.name = String(value ?? '')
        } else if (field === 'code') {
          const v = value === '' ? null : String(value ?? '')
          next.pc_org_code = v
          next.code = v
        } else if (field === 'pc_number') {
          const v = value === '' ? null : String(value ?? '')
          next.pc_number = v
          next.pc_no = v
          next.number = v
        } else if (field === 'active') {
          next.is_active = Boolean(value)
          next.active = Boolean(value)
        }

        return next
      })
    )

    // 2) debounce write
    const key = `${pcOrgId}:${field}`
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

        const updated = await updatePcOrg(pcOrgId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === pcOrgId ? updated : r)))
      } catch (err: any) {
        console.error('Debounced PC Org update error', err)
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
          + Add PC Org
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
        <div
          className="rounded border overflow-hidden"
          style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
        >
          <table className="w-full text-sm">
            <thead
              className="border-b"
              style={{ borderColor: 'var(--to-border)', background: 'var(--to-header-bg)' }}
            >
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
                    <td className="px-3 py-2">
                      {getName(r) || <span className="text-[var(--to-ink-muted)]">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {getCode(r) || <span className="text-[var(--to-ink-muted)]">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      {getPcNumber(r) || <span className="text-[var(--to-ink-muted)]">—</span>}
                    </td>
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

      <Pc_orgInspector
        open={inspectorOpen}
        mode={inspectorMode}
        pcOrg={inspectorMode === 'edit' ? selectedPcOrg : null}
        onChange={updateField}
        onCreate={onCreate}
        onDelete={onDelete}
        onClose={onCloseInspector}
      />
    </div>
  )
}
