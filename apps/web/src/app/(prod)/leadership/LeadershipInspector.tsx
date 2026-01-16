'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '@/app/(prod)/_shared/AdminOverlay'
import type { AssignmentRow } from '../assignment/assignment.types'
import type { LeadershipEdge } from './leadership.types'
import { closeLeadershipEdge, setLeaderForChild } from './leadership.api'

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  edge: LeadershipEdge | null
  assignments: AssignmentRow[]
  onClose: () => void
  onSaved: () => void
}

function todayYMD() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function displayAssignment(a: AssignmentRow | null | undefined) {
  if (!a) return '—'
  const name = a.full_name ?? '—'
  const org = a.pc_org_name ? ` • ${a.pc_org_name}` : ''
  const title = a.position_title ? ` • ${a.position_title}` : ''
  return `${name}${org}${title}`
}

export default function LeadershipInspector(props: Props) {
  const { open, mode, edge, assignments, onClose, onSaved } = props

  const [childId, setChildId] = useState<string>('')
  const [parentId, setParentId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(todayYMD())

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assignmentsById = useMemo(() => {
    const m = new Map<string, AssignmentRow>()
    for (const a of assignments) {
      if (a.assignment_id) m.set(a.assignment_id, a)
    }
    return m
  }, [assignments])

  const child = childId ? assignmentsById.get(childId) ?? null : null
  const parent = parentId ? assignmentsById.get(parentId) ?? null : null

  // Initialize form state when opening / switching rows
  useEffect(() => {
    if (!open) return

    setError(null)

    if (mode === 'create') {
      setChildId('')
      setParentId('')
      setStartDate(todayYMD())
      return
    }

    // edit mode
    setChildId(edge?.child_assignment_id ?? '')
    setParentId(edge?.parent_assignment_id ?? '')
    // default to today when changing leader; user can pick another date
    setStartDate(todayYMD())
  }, [open, mode, edge])

  const canSave = childId && parentId && childId !== parentId && !!startDate

  async function onSave() {
    if (!canSave) {
      setError('Select a child and a leader (they cannot be the same).')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await setLeaderForChild({
        child_assignment_id: childId,
        parent_assignment_id: parentId,
        start_date: startDate,
      })

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to save leadership relationship')
    } finally {
      setSaving(false)
    }
  }

  async function onEndRelationship() {
    if (!edge?.assignment_reporting_id) {
      setError('Missing edge id (assignment_reporting_id).')
      return
    }

    setSaving(true)
    setError(null)

    try {
      await closeLeadershipEdge({
        assignment_reporting_id: edge.assignment_reporting_id,
        end_date: todayYMD(),
      })

      onSaved()
      onClose()
    } catch (e: any) {
      setError(e?.message ?? 'Failed to end relationship')
    } finally {
      setSaving(false)
    }
  }

  const title = mode === 'create' ? 'New leadership edge' : 'Edit leadership edge'
  const subtitle =
    mode === 'edit' && edge?.assignment_reporting_id ? `id: ${edge.assignment_reporting_id}` : undefined

  return (
    <AdminOverlay
      open={open}
      mode={mode}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      widthClassName="w-[980px] max-w-[95vw]"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="text-xs text-[var(--to-ink-muted)]">
            Change leader option will close any active tie to prior leader to begin reporting to new leader.
          </div>

          <div className="flex items-center gap-2">
            {mode === 'edit' && (
              <button
                onClick={onEndRelationship}
                disabled={saving}
                className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
                style={{ borderColor: 'var(--to-border)' }}
              >
                End relationship
              </button>
            )}

            <button
              onClick={onClose}
              disabled={saving}
              className="rounded border px-3 py-2 text-sm font-medium hover:bg-[var(--to-surface-2)] disabled:opacity-60"
              style={{ borderColor: 'var(--to-border)' }}
            >
              Cancel
            </button>

            <button
              onClick={onSave}
              disabled={!canSave || saving}
              className="rounded px-3 py-2 text-sm font-semibold disabled:opacity-60"
              style={{
                background: 'var(--to-btn-primary-bg)',
                color: 'var(--to-btn-primary-text)',
              }}
            >
              {saving ? 'Saving…' : mode === 'create' ? 'Create' : 'Change leader'}
            </button>
          </div>
        </div>
      }
    >
      <div className="p-4">
        {error && (
          <div
            className="mb-3 rounded border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
          >
            <div className="font-semibold text-red-700">Error</div>
            <div className="mt-1 font-mono text-[12px] text-[var(--to-ink-muted)]">{error}</div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div
            className="rounded border p-3"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              Direct Report
            </div>

            <select
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              className="mt-2 w-full rounded border bg-[var(--to-surface)] px-3 py-2 text-sm"
              style={{ borderColor: 'var(--to-border)' }}
              disabled={saving || mode === 'edit'} // in edit mode keep child fixed
            >
              <option value="">Select child assignment…</option>
              {assignments.map((a) => (
                <option key={a.assignment_id ?? ''} value={a.assignment_id ?? ''}>
                  {displayAssignment(a)}
                </option>
              ))}
            </select>

            <div className="mt-2 text-xs text-[var(--to-ink-muted)]">{child ? displayAssignment(child) : '—'}</div>
          </div>

          <div
            className="rounded border p-3"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              Reports To
            </div>

            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="mt-2 w-full rounded border bg-[var(--to-surface)] px-3 py-2 text-sm"
              style={{ borderColor: 'var(--to-border)' }}
              disabled={saving}
            >
              <option value="">Select leader assignment…</option>
              {assignments
                .filter((a) => (childId ? a.assignment_id !== childId : true))
                .map((a) => (
                  <option key={a.assignment_id ?? ''} value={a.assignment_id ?? ''}>
                    {displayAssignment(a)}
                  </option>
                ))}
            </select>

            <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
              {parent ? displayAssignment(parent) : '—'}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div
            className="rounded border p-3"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              Effective start date
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-2 w-full rounded border bg-[var(--to-surface)] px-3 py-2 text-sm"
              style={{ borderColor: 'var(--to-border)' }}
              disabled={saving}
            />
            <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
              Save will close any active edge for the child using this date as end_date.
            </div>
          </div>

          {mode === 'edit' && (
            <div
              className="rounded border p-3 md:col-span-2"
              style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Current edge</div>
              <div className="mt-2 text-sm text-[var(--to-ink)]">
                {displayAssignment(edge?.child ?? null)} → {displayAssignment(edge?.parent ?? null)}
              </div>
              <div className="mt-1 text-xs text-[var(--to-ink-muted)]">
                start: {edge?.start_date ?? '—'} • end: {edge?.end_date ?? '—'} • active:{' '}
                {edge?.active ? 'true' : 'false'}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminOverlay>
  )
}
