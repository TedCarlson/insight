// apps/web/src/app/(prod)/assignment/AssignmentTable.tsx

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/app/(prod)/_shared/supabase'
import {
  createAssignment,
  fetchAssignments,
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')

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

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const [assignments, persons, orgs, titles] = await Promise.all([
          fetchAssignments(),
          fetchPersons(),
          fetchPcOrgOptions(),
          fetchPositionTitles(),
        ])

        if (!alive) return

        setRows(assignments)

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
        setError(e?.message ?? 'Failed to load assignments.')
      } finally {
        if (alive) setLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    return () => {
      writeTimers.current.forEach((t) => clearTimeout(t))
      writeTimers.current.clear()
      writeSeq.current.clear()
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows

    return rows.filter((r) => {
      const hay = [
        r.full_name ?? '',
        r.tech_id ?? '',
        r.position_title ?? '',
        r.pc_org_name ?? '',
        r.assignment_id ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

  const selectedAssignment = useMemo(() => {
    if (!selectedAssignmentId) return null
    return rows.find((r) => r.assignment_id === selectedAssignmentId) ?? null
  }, [rows, selectedAssignmentId])

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
    const created = await createAssignment(payload)
    setRows((prev) => [created, ...prev])
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

        // position_title is stored as string; no derived label needed
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
      } catch (err: any) {
        console.error('Debounced assignment update error', err)
        setError(err?.message ?? 'Update failed.')
      } finally {
        writeTimers.current.delete(key)
      }
    }, WRITE_DELAY_MS)

    writeTimers.current.set(key, timer)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-3">
          <input
            placeholder="Search by person, tech id, org, title…"
            className="w-96 rounded border px-2 py-1 text-sm bg-white"
            style={{ borderColor: 'var(--to-border)' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && (
            <span className="text-sm text-[var(--to-ink-muted)]">Loading…</span>
          )}
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
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-[var(--to-ink-muted)]"
                  >
                    No assignments yet.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
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
