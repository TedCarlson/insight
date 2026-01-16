'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAssignments } from '../assignment/assignment.api'
import type { AssignmentRow } from '../assignment/assignment.types'
import { fetchLeadership } from './leadership.api'
import type { LeadershipEdge, LeadershipRow } from './leadership.types'
import LeadershipInspector from './LeadershipInspector'

function formatDate(d: string | null) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

function displayAssignment(a: AssignmentRow | null | undefined) {
  if (!a) return '—'
  const name = a.full_name ?? '—'
  const org = a.pc_org_name ? ` • ${a.pc_org_name}` : ''
  const title = a.position_title ? ` • ${a.position_title}` : ''
  return `${name}${org}${title}`
}

export default function LeadershipTable() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [rows, setRows] = useState<LeadershipEdge[]>([])
  const [search, setSearch] = useState('')

  const [assignments, setAssignments] = useState<AssignmentRow[]>([])

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<'create' | 'edit'>('create')
  const [selected, setSelected] = useState<LeadershipEdge | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const [edges, assignmentRows] = await Promise.all([fetchLeadership(), fetchAssignments()])

      setAssignments(assignmentRows)

      const byId = new Map<string, AssignmentRow>()
      for (const a of assignmentRows) {
        if (a.assignment_id) byId.set(a.assignment_id, a)
      }

      const hydrated: LeadershipEdge[] = (edges ?? []).map((e) => ({
        ...(e as LeadershipRow),
        child: e.child_assignment_id ? byId.get(e.child_assignment_id) ?? null : null,
        parent: e.parent_assignment_id ? byId.get(e.parent_assignment_id) ?? null : null,
      }))

      setRows(hydrated)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leadership edges')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const blob = [
        r.assignment_reporting_id,
        r.child_assignment_id,
        r.parent_assignment_id,
        r.child?.full_name,
        r.parent?.full_name,
        r.child?.pc_org_name,
        r.parent?.pc_org_name,
        r.child?.position_title,
        r.parent?.position_title,
        r.start_date,
        r.end_date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return blob.includes(q)
    })
  }, [rows, search])

  const onNew = () => {
    setSelected(null)
    setInspectorMode('create')
    setInspectorOpen(true)
  }

  const onRowClick = (r: LeadershipEdge) => {
    setSelected(r)
    setInspectorMode('edit')
    setInspectorOpen(true)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-[var(--to-ink)]">
            Rows: <span className="font-mono">{loading ? '…' : filtered.length}</span>
          </div>

          <button
            onClick={load}
            className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
            style={{ borderColor: 'var(--to-border)' }}
          >
            Refresh
          </button>

          <button
            onClick={onNew}
            className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)]"
            style={{ borderColor: 'var(--to-border)' }}
          >
            New
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search leadership…"
          className="w-full max-w-md rounded border bg-[var(--to-surface)] px-3 py-2 text-sm"
          style={{ borderColor: 'var(--to-border)' }}
        />
      </div>

      {error && (
        <div
          className="rounded border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
        >
          <div className="font-semibold text-red-700">Error loading assignment_leadership_admin_v</div>
          <div className="mt-1 font-mono text-[12px] text-[var(--to-ink-muted)]">{error}</div>
        </div>
      )}

      <div
        className="overflow-auto rounded border"
        style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
      >
        <table className="min-w-full border-collapse text-sm">
          <thead
            className="sticky top-0"
            style={{ background: 'var(--to-surface)', borderBottom: '1px solid var(--to-border)' }}
          >
            <tr>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Active
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Child (Reports)
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Leader (Parent)
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                Start
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
                End
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-3 text-[var(--to-ink-muted)]" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-3 text-[var(--to-ink-muted)]" colSpan={5}>
                  No leadership edges found.
                </td>
              </tr>
            ) : (
              filtered.map((r, idx) => (
                <tr
                  key={`${r.assignment_reporting_id ?? idx}`}
                  onClick={() => onRowClick(r)}
                  className="cursor-pointer"
                  style={{
                    borderTop: '1px solid var(--to-border)',
                    background: idx % 2 === 0 ? 'var(--to-surface)' : 'var(--to-surface-2)',
                  }}
                >
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--to-ink)]">{r.active ? '✅' : '—'}</td>
                  <td className="max-w-[520px] truncate px-3 py-2 text-[var(--to-ink)]">
                    {displayAssignment(r.child)}
                  </td>
                  <td className="max-w-[520px] truncate px-3 py-2 text-[var(--to-ink)]">
                    {displayAssignment(r.parent)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--to-ink)]">{formatDate(r.start_date)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-[var(--to-ink)]">{formatDate(r.end_date)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <LeadershipInspector
        open={inspectorOpen}
        mode={inspectorMode}
        edge={selected}
        assignments={assignments}
        onClose={() => setInspectorOpen(false)}
        onSaved={load}
      />
    </div>
  )
}
