// apps/web/src/app/(prod)/pc_org/Pc_orgTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPcOrg, fetchPcOrgs, updatePcOrg } from './pc_org.api'
import type { CreatePcOrgInput, EditableField, PcOrgInspectorMode, PcOrgRow } from './pc_org.types'
import Pc_orgInspector from './Pc_orgInspector'

const WRITE_DELAY_MS = 450

function getId(row: PcOrgRow): string {
  return String(row.pc_org_id)
}
function getName(row: PcOrgRow): string {
  return String(row.pc_org_name ?? '')
}
function getPcNumber(row: PcOrgRow): string {
  const v = row.pc_number
  return v === null || v === undefined ? '' : String(v)
}
function getDivision(row: PcOrgRow): string {
  return String(row.division_name ?? '')
}
function getRegion(row: PcOrgRow): string {
  return String(row.region_name ?? '')
}
function getMso(row: PcOrgRow): string {
  return String(row.mso_name ?? '')
}

export default function Pc_orgTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<PcOrgRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<PcOrgInspectorMode>('create')
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
      const hay = `${getName(r)} ${getPcNumber(r)} ${getDivision(r)} ${getRegion(r)} ${getMso(r)} ${getId(r)}`.toLowerCase()
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

  function openEdit(row: PcOrgRow) {
    setInspectorMode('edit')
    setSelectedId(getId(row))
    setInspectorOpen(true)
  }

  function closeInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreatePcOrgInput) {
    const created = await createPcOrg(payload)
    setRows((prev) => [created, ...prev])
  }

  function updateField(pcOrgId: string, field: EditableField, value: any) {
    // optimistic patch (names will refresh after update re-reads view)
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== pcOrgId) return r
        const next: PcOrgRow = { ...(r as any) }
        if (field === 'pc_org_name') next.pc_org_name = String(value ?? '')
        if (field === 'pc_id') next.pc_id = String(value ?? '')
        if (field === 'division_id') next.division_id = String(value ?? '')
        if (field === 'region_id') next.region_id = String(value ?? '')
        if (field === 'mso_id') next.mso_id = String(value ?? '')
        return next
      })
    )

    const key = `${pcOrgId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      if ((writeSeq.current.get(key) ?? 0) !== seq) return
      try {
        setError(null)
        const patch: any = {}
        if (field === 'pc_org_name') patch.pc_org_name = String(value ?? '').trim()
        if (field === 'pc_id') patch.pc_id = String(value ?? '').trim()
        if (field === 'division_id') patch.division_id = String(value ?? '').trim()
        if (field === 'region_id') patch.region_id = String(value ?? '').trim()
        if (field === 'mso_id') patch.mso_id = String(value ?? '').trim()

        const updated = await updatePcOrg(pcOrgId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === pcOrgId ? updated : r)))
      } catch (err: any) {
        console.error('PC Org update error', err)
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
          <div className="text-lg font-semibold text-[var(--to-ink)] whitespace-nowrap">PC Org</div>

          <input
            className="w-72 max-w-[60vw] rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            placeholder="Search name, PC, division, region, MSO, or id…"
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
          + Add PC Org
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
                <th className="px-3 py-2">PC Org Name</th>
                <th className="px-3 py-2">PC</th>
                <th className="px-3 py-2">Division</th>
                <th className="px-3 py-2">Region</th>
                <th className="px-3 py-2">MSO</th>
                <th className="px-3 py-2">ID</th>
              </tr>
            </thead>

            <tbody>
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-[var(--to-ink-muted)]" colSpan={6}>
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
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getPcNumber(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getDivision(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getRegion(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{getMso(r)}</td>
                    <td className="px-3 py-2 text-[var(--to-ink-muted)]">{id}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Pc_orgInspector
        open={inspectorOpen}
        mode={inspectorMode}
        pcOrg={inspectorMode === 'edit' ? selected : null}
        onChange={updateField}
        onCreate={onCreate}
        onClose={closeInspector}
      />
    </div>
  )
}
