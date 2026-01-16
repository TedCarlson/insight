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
  const [activeOnly, setActiveOnly] = useState(true)

  const [assignments, setAssignments] = useState<AssignmentRow[]>([])

  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<'create' | 'edit'>('create')
  const [selected, setSelected] = useState<LeadershipEdge | null>(null)

  async function load() {
    setLoading(true)
    setError(null)

    try {
      const [assignmentRows, leadershipRows] = await Promise.all([
        fetchAssignments(),
        fetchLeadership(),
      ])

      setAssignments(assignmentRows)

      // hydrate child/parent labels from assignment_admin_v
      const byId = new Map<string, AssignmentRow>()
      for (const a of assignmentRows) {
        if (a.assignment_id) byId.set(a.assignment_id, a)
      }

      const edges: LeadershipEdge[] = (leadershipRows ?? []).map((r: LeadershipRow) => ({
        ...r,
        child: r.child_assignment_id ? byId.get(r.child_assignment_id) ?? null : null,
        parent: r.parent_assignment_id ? byId.get(r.parent_assignment_id) ?? null : null,
      }))

      setRows(edges)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load leadership edges.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    let out = rows

    if (activeOnly) {
      out = out.filter((r) => !!r.active)
    }

    if (!search.trim()) return out
    const q = search.toLowerCase()
    return out.filter((r) => {
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
  }, [rows, search, activeOnly])

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

          {/* Pill toggle (small, uniform) */}
          <div
            className="inline-flex overflow-hidden rounded-full border"
            style={{ borderColor: 'var(--to-border)' }}
          >
            <button
              type="button"
              onClick={() => setActiveOnly(true)}
              className="px-3 py-1 text-xs font-semibold"
              style={{
                background: activeOnly ? 'var(--to-blue-100)' : 'var(--to-surface)',
                color: 'var(--to-ink)',
              }}
              disabled={loading}
            >
              Active
            </button>

            <button
              type="button"
              onClick={() => setActiveOnly(false)}
              className="px-3 py-1 text-xs font-semibold"
              style={{
                background: !activeOnly ? 'var(--to-blue-100)' : 'var(--to-surface)',
                color: 'var(--to-ink)',
                borderLeft: '1px solid var(--to-border)',
              }}
              disabled={loading}
            >
              All
            </button>
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

      <div className="rounded border" style={{ borderColor: 'var(--to-border)', overflow: 'hidden' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--to-header-bg)' }}>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--to-ink-muted)]">Active</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--to-ink-muted)]">Report</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--to-ink-muted)]">Leader</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--to-ink-muted)]">Start</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--to-ink-muted)]">End</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className="px-3 py-4 text-sm text-[var(--to-ink-muted)]" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sm text-[var(--to-ink-muted)]" colSpan={5}>
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
