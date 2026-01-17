// apps/web/src/app/(prod)/quota/QuotaTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createQuota, deleteQuota, fetchQuotas, updateQuota } from './quota.api'
import type { CreateQuotaInput, EditableField, QuotaInspectorMode, QuotaRow } from './quota.types'
import QuotaInspector from './QuotaInspector'

const WRITE_DELAY_MS = 450

function getId(row: QuotaRow): string {
  const id = row.quota_id ?? row.id
  return id ? String(id) : ''
}

function getName(row: QuotaRow): string {
  return String(row.quota_name ?? row.name ?? '')
}

function getCode(row: QuotaRow): string {
  return String(row.quota_code ?? row.code ?? '')
}

function getQuotaValue(row: QuotaRow): string {
  const v = row.quota_value ?? row.value ?? row.target
  return v === null || v === undefined ? '' : String(v)
}

function getActive(row: QuotaRow): boolean {
  const v = row.is_active ?? row.active
  return v === null || v === undefined ? true : Boolean(v)
}

function parseNumberOrNull(s: string): number | null {
  const t = s.trim()
  if (!t) return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export default function QuotaTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<QuotaRow[]>([])
  const [search, setSearch] = useState('')

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<QuotaInspectorMode>('create')
  const [selectedQuotaId, setSelectedQuotaId] = useState<string | null>(null)

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
      const hay = `${getName(r)} ${getCode(r)} ${getQuotaValue(r)} ${getId(r)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  const selectedQuota = useMemo(() => {
    if (!selectedQuotaId) return null
    return rows.find((r) => getId(r) === selectedQuotaId) ?? null
  }, [rows, selectedQuotaId])

  function openCreate() {
    setInspectorMode('create')
    setSelectedQuotaId(null)
    setInspectorOpen(true)
  }

  function openEdit(row: QuotaRow) {
    const id = getId(row)
    if (!id) return
    setInspectorMode('edit')
    setSelectedQuotaId(id)
    setInspectorOpen(true)
  }

  function onCloseInspector() {
    setInspectorOpen(false)
  }

  async function onCreate(payload: CreateQuotaInput) {
    const created = await createQuota(payload)
    setRows((prev) => [created, ...prev])
  }

  async function onDelete(quotaId: string) {
    await deleteQuota(quotaId)
    setRows((prev) => prev.filter((r) => getId(r) !== quotaId))
  }

  function updateField(quotaId: string, field: EditableField, value: any) {
    // 1) optimistic
    setRows((prev) =>
      prev.map((r) => {
        if (getId(r) !== quotaId) return r
        const next: QuotaRow = { ...(r as any) }

        if (field === 'name') {
          next.quota_name = String(value ?? '')
          next.name = String(value ?? '')
        } else if (field === 'code') {
          const v = value === '' ? null : String(value ?? '')
          next.quota_code = v
          next.code = v
        } else if (field === 'quota_value') {
          // keep as string in UI row until re-read
          const v = String(value ?? '')
          next.quota_value = v
          next.value = v
          next.target = v
        } else if (field === 'active') {
          next.is_active = Boolean(value)
          next.active = Boolean(value)
        }

        return next
      })
    )

    // 2) debounce write
    const key = `${quotaId}:${field}`
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
        if (field === 'quota_value') patch.quota_value = parseNumberOrNull(String(value ?? ''))
        if (field === 'active') patch.active = Boolean(value)

        const updated = await updateQuota(quotaId, patch)
        setRows((prev) => prev.map((r) => (getId(r) === quotaId ? updated : r)))
      } catch (err: any) {
        console.error('Debounced quota update error', err)
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
            placeholder="Search by name, code, value, id…"
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
          + Add Quota
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
                <th className="px-3 py-2">Value</th>
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
                    <td className="px-3 py-2">{getQuotaValue(r) || <span className="text-[var(--to-ink-muted)]">—</span>}</td>
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

      <QuotaInspector
        open={inspectorOpen}
        mode={inspectorMode}
        quota={inspectorMode === 'edit' ? selectedQuota : null}
        onChange={updateField}
        onCreate={onCreate}
        onDelete={onDelete}
        onClose={onCloseInspector}
      />
    </div>
  )
}
