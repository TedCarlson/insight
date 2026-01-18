// apps/web/src/app/(prod)/assignment/AssignmentTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/app/(prod)/_shared/supabase'
import {
  createAssignment,
  listAssignments,
  updateAssignmentCore,
  fetchPositionTitles,
} from './assignment.api'
import type {
  AssignmentInspectorMode,
  AssignmentRow,
  CreateAssignmentInput,
  PositionTitleOption,
} from './assignment.types'
import { fetchPersons } from '../person/person.api'
import type { PersonRow } from '../person/person.types'
import AssignmentInspector, {
  type EditableField,
  type PcOrgOption,
  type PersonOption,
} from './AssignmentInspector'

const supabase = createClient()

const WRITE_DELAY_MS = 450
const SEARCH_DEBOUNCE_MS = 300

function formatDate(d: string | null) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

async function fetchPcOrgOptions(): Promise<PcOrgOption[]> {
  const { data, error } = await supabase
    .from('pc_org_admin_v')
    .select(
      'pc_org_id, pc_org_name, pc_number, mso_name, division_name, region_name'
    )
    .order('pc_org_name', { ascending: true, nullsFirst: false })

  if (error) throw error

  return (
    data?.map((r: any) => ({
      id: r.pc_org_id,
      label: r.pc_org_name ?? r.pc_org_id,
      meta: [
        r.pc_number ? `PC ${r.pc_number}` : null,
        r.mso_name ?? null,
        r.division_name ?? null,
        r.region_name ?? null,
      ]
        .filter(Boolean)
        .join(' • '),
    })) ?? []
  )
}

export default function AssignmentTable() {
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [total, setTotal] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  const [reloadKey, setReloadKey] = useState(0)

  const [people, setPeople] = useState<PersonOption[]>([])
  const [pcOrgs, setPcOrgs] = useState<PcOrgOption[]>([])
  const [positionTitles, setPositionTitles] = useState<PositionTitleOption[]>([])

  const personLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of people) map.set(p.id, p.label)
    return map
  }, [people])

  const pcOrgLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of pcOrgs) map.set(o.id, o.label)
    return map
  }, [pcOrgs])

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] =
    useState<AssignmentInspectorMode>('create')
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(
    null
  )

  const writeTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const writeSeq = useRef(new Map<string, number>())

  // Load options once (people, orgs, titles)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setError(null)
        const [persons, orgs, titles] = await Promise.all([
          fetchPersons(),
          fetchPcOrgOptions(),
          fetchPositionTitles(),
        ])

        if (!alive) return

        setPeople(
          (persons ?? []).map((p: PersonRow) => ({
            id: p.person_id,
            label: p.full_name ?? p.emails ?? p.mobile ?? p.person_id,
          }))
        )

        setPcOrgs(orgs)
        setPositionTitles(titles)
      } catch (e: any) {
        if (!alive) return
        setError(e?.message ?? 'Failed to load reference data.')
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  // Debounce search → server query
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [search])

  // Reset to page 1 when the debounced search changes
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, pageSize])

  // Load paged assignments whenever paging/search changes (or after create)
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const { rows: nextRows, total: nextTotal } = await listAssignments({
          page,
          pageSize,
          q: debouncedSearch || undefined,
        })

        if (!alive) return
        setRows(nextRows)
        setTotal(nextTotal)
      } catch (err: unknown) {
        if (!alive) return
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as any).message)
            : 'Failed to load assignments.'
        setError(msg)
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [page, pageSize, debouncedSearch, reloadKey])

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = writeTimers.current
    return () => {
      for (const timer of timers.values()) clearTimeout(timer)
    }
  }, [])

  const selectedAssignment = useMemo(() => {
    if (!selectedAssignmentId) return null
    return rows.find((r) => r.assignment_id === selectedAssignmentId) ?? null
  }, [rows, selectedAssignmentId])

  const rangeFrom = total === 0 ? 0 : (page - 1) * pageSize + 1
  const rangeTo = Math.min(page * pageSize, total)
  const canPrev = page > 1
  const canNext = page * pageSize < total

  function onAddAssignment() {
    setInspectorMode('create')
    setSelectedAssignmentId(null)
    setInspectorOpen(true)
  }

  function onEditAssignment(row: AssignmentRow) {
    if (!row.assignment_id) return
    setInspectorMode('edit')
    setSelectedAssignmentId(row.assignment_id)
    setInspectorOpen(true)
  }

  function onCloseInspector(reason: 'close' | 'cancel' | 'created') {
    setInspectorOpen(false)
    if (reason === 'created') {
      setSelectedAssignmentId(null)
      setInspectorMode('create')
    }
  }

  async function onCreate(payload: CreateAssignmentInput) {
    setError(null)
    await createAssignment(payload)

    // Refresh list (keeps server ordering authoritative)
    setPage(1)
    setReloadKey((k) => k + 1)
  }

  function updateField(assignmentId: string, field: EditableField, value: any) {
    // 1) optimistic update
    setRows((prev) =>
      prev.map((r) => {
        if (r.assignment_id !== assignmentId) return r
        const next: AssignmentRow = { ...(r as any), [field]: value }

        if (field === 'person_id') {
          next.full_name = value
            ? personLabelById.get(String(value)) ?? next.full_name
            : null
        }

        if (field === 'pc_org_id') {
          next.pc_org_name = value
            ? pcOrgLabelById.get(String(value)) ?? next.pc_org_name
            : null
        }

        return next
      })
    )

    // 2) debounce DB write per assignment+field
    const key = `${assignmentId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const timer = setTimeout(async () => {
      try {
        const updated = await updateAssignmentCore(assignmentId, {
          [field]: value,
        } as any)

        // ignore stale responses
        if ((writeSeq.current.get(key) ?? 0) !== seq) return

        setRows((prev) =>
          prev.map((r) => (r.assignment_id === assignmentId ? updated : r))
        )
      } catch (err: unknown) {
        console.error('Debounced assignment update error', err)
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as any).message)
            : 'Update failed.'
        setError(msg)
      } finally {
        writeTimers.current.delete(key)
      }
    }, WRITE_DELAY_MS)

    writeTimers.current.set(key, timer)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Search by person, tech id, org, title…"
            className="w-96 rounded border px-2 py-1 text-sm bg-white"
            style={{ borderColor: 'var(--to-border)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex items-center gap-2 text-sm text-[var(--to-ink-muted)]">
            <span>
              {rangeFrom}-{rangeTo} of {total}
            </span>

            <button
              className="rounded border px-2 py-1"
              style={{ borderColor: 'var(--to-border)' }}
              disabled={!canPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>

            <button
              className="rounded border px-2 py-1"
              style={{ borderColor: 'var(--to-border)' }}
              disabled={!canNext || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>

            <select
              className="rounded border px-2 py-1 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              disabled={loading}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            {loading && <span>Loading…</span>}
          </div>
        </div>

        <button
          onClick={onAddAssignment}
          className="rounded px-3 py-1.5 text-sm bg-[var(--to-blue-600)] text-white"
        >
          + New Assignment
        </button>
      </div>

      {error && (
        <div className="px-6 pb-3">
          <div
            className="rounded border px-3 py-2 text-sm"
            style={{
              borderColor: 'var(--to-border)',
              background: 'var(--to-surface)',
              color: 'var(--to-ink)',
            }}
          >
            <span className="font-semibold">Error:</span> {error}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        <div
          className="h-full rounded border overflow-auto"
          style={{ borderColor: 'var(--to-border)' }}
        >
          <table className="w-full text-sm">
            <thead
              className="sticky top-0 z-10 border-b"
              style={{
                borderColor: 'var(--to-border)',
                background: 'var(--to-header-bg)',
              }}
            >
              <tr className="text-left text-[var(--to-ink-muted)]">
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Tech ID</th>
                <th className="px-3 py-2 font-medium">Position</th>
                <th className="px-3 py-2 font-medium">Org</th>
                <th className="px-3 py-2 font-medium">Start</th>
                <th className="px-3 py-2 font-medium">End</th>
              </tr>
            </thead>

            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--to-ink-muted)]"
                  >
                    No assignments yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={row.assignment_id ?? Math.random().toString(36)}
                    className="border-t hover:bg-[var(--to-row-hover)] cursor-pointer"
                    style={{ borderColor: 'var(--to-border)' }}
                    onClick={() => onEditAssignment(row)}
                  >
                    <td className="px-3 py-2 font-medium">
                      {row.full_name ?? '—'}
                      <div className="text-xs text-[var(--to-ink-muted)]">
                        {row.person_id ?? '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2">{row.tech_id ?? '—'}</td>
                    <td className="px-3 py-2">{row.position_title ?? '—'}</td>
                    <td className="px-3 py-2">
                      {row.pc_org_name ?? '—'}
                      <div className="text-xs text-[var(--to-ink-muted)]">
                        {row.pc_org_id ?? '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2">{formatDate(row.start_date)}</td>
                    <td className="px-3 py-2">{formatDate(row.end_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssignmentInspector
        open={inspectorOpen}
        mode={inspectorMode}
        assignment={inspectorMode === 'edit' ? selectedAssignment : null}
        people={people}
        pcOrgs={pcOrgs}
        positionTitles={positionTitles}
        onChange={updateField}
        onCreate={onCreate}
        onClose={onCloseInspector}
      />
    </div>
  )
}
