'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import { fetchAssignmentReportingEdges } from './assignment.api'
import type {
  AssignmentReportingEdge,
  AssignmentRow,
  AssignmentInspectorMode,
  CreateAssignmentInput,
  PositionTitleOption,
} from './assignment.types'

export type EditableField =
  | 'person_id'
  | 'pc_org_id'
  | 'tech_id'
  | 'position_title'
  | 'start_date'
  | 'end_date'

export type PersonOption = { id: string; label: string }
export type PcOrgOption = { id: string; label: string; meta?: string }

function formatDate(d: string | null | undefined) {
  if (!d) return '—'
  return String(d).slice(0, 10)
}

function assignmentLabel(a?: AssignmentRow | null) {
  if (!a) return '—'
  const name = a.full_name ?? '—'
  const title = a.position_title ? ` — ${a.position_title}` : ''
  const org = a.pc_org_name ? ` @ ${a.pc_org_name}` : ''
  const tech = a.tech_id ? ` (${a.tech_id})` : ''
  return `${name}${title}${org}${tech}`
}

export default function AssignmentInspector({
  open,
  mode,
  assignment,
  people,
  pcOrgs,
  positionTitles,
  onChange,
  onCreate,
  onClose,
}: {
  open: boolean
  mode: AssignmentInspectorMode
  assignment?: AssignmentRow | null
  people: PersonOption[]
  pcOrgs: PcOrgOption[]
  positionTitles: PositionTitleOption[]
  onChange: (assignmentId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreateAssignmentInput) => Promise<void>
  onClose: (reason: 'close' | 'cancel' | 'created') => void
}) {
  const isCreate = mode === 'create'
  const assignmentId = assignment?.assignment_id ?? null

  const [draft, setDraft] = useState<CreateAssignmentInput>({
    person_id: null,
    pc_org_id: null,
    tech_id: null,
    position_title: null,
    start_date: null,
    end_date: null,
  })

  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Reporting (read-only)
  const [repLoading, setRepLoading] = useState(false)
  const [repError, setRepError] = useState<string | null>(null)
  const [edges, setEdges] = useState<AssignmentReportingEdge[]>([])

  // Initialize draft on open for create
  useEffect(() => {
    if (!open) return
    setSubmitError(null)

    if (isCreate) {
      setDraft({
        person_id: null,
        pc_org_id: null,
        tech_id: null,
        position_title: null,
        start_date: null,
        end_date: null,
      })
    }
  }, [open, isCreate])

  // Load reporting edges when editing
  useEffect(() => {
    if (!open) return
    if (isCreate) return
    if (!assignmentId) return

    let alive = true
    ;(async () => {
      try {
        setRepLoading(true)
        setRepError(null)
        const data = await fetchAssignmentReportingEdges(assignmentId)
        if (!alive) return
        setEdges(data)
      } catch (e: any) {
        if (!alive) return
        setRepError(e?.message ?? 'Failed to load reporting.')
      } finally {
        if (alive) setRepLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [open, isCreate, assignmentId])

  const parents = useMemo(() => {
    const id = assignmentId
    if (!id) return []
    return edges.filter((e) => e.child_assignment_id === id)
  }, [edges, assignmentId])

  const children = useMemo(() => {
    const id = assignmentId
    if (!id) return []
    return edges.filter((e) => e.parent_assignment_id === id)
  }, [edges, assignmentId])

  async function handleCreate() {
    setSubmitError(null)

    if (!draft.person_id) {
      setSubmitError('Person is required.')
      return
    }
    if (!draft.pc_org_id) {
      setSubmitError('PC Org is required.')
      return
    }

    setSaving(true)
    try {
      await onCreate({
        person_id: draft.person_id,
        pc_org_id: draft.pc_org_id,
        tech_id: draft.tech_id ?? null,
        position_title: draft.position_title ?? null,
        start_date: draft.start_date || null,
        end_date: draft.end_date || null,
      })
      onClose('created')
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  const title = isCreate ? 'Add Assignment' : 'Edit Assignment'
  const subtitle = isCreate
    ? 'Create a new assignment record'
    : 'Zoomed edit surface (writes apply immediately)'

  return (
    <AdminOverlay
      open={open}
      mode={mode}
      title={title}
      subtitle={subtitle}
      onClose={() => onClose(isCreate ? 'cancel' : 'close')}
      footer={
        isCreate ? (
          <div className="flex justify-end gap-2">
            <button
              className="rounded border px-3 py-1.5 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              onClick={() => onClose('cancel')}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className="rounded px-3 py-1.5 text-sm bg-[var(--to-blue-600)] text-white disabled:opacity-60"
              disabled={saving}
              onClick={handleCreate}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        ) : null
      }
    >
      {!isCreate ? (
        <div className="mb-4 text-xs text-[var(--to-ink-muted)]">
          {assignmentLabel(assignment)}
        </div>
      ) : null}

      {submitError && (
        <div
          className="mb-4 rounded border px-3 py-2 text-sm bg-white"
          style={{ borderColor: 'var(--to-border)', color: 'var(--to-ink)' }}
        >
          <span className="font-semibold">Error:</span> {submitError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Person */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--to-ink-muted)]">
            Person
          </label>

          {isCreate ? (
            <select
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={draft.person_id ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, person_id: e.target.value || null })
              }
            >
              <option value="" disabled>
                Select a person…
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={assignment?.person_id ?? ''}
              onChange={(e) => {
                if (!assignmentId) return
                onChange(assignmentId, 'person_id', e.target.value || null)
              }}
            >
              <option value="" disabled>
                Select a person…
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* PC Org */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--to-ink-muted)]">
            PC Org
          </label>

          {isCreate ? (
            <select
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={draft.pc_org_id ?? ''}
              onChange={(e) =>
                setDraft({ ...draft, pc_org_id: e.target.value || null })
              }
            >
              <option value="" disabled>
                Select an org…
              </option>
              {pcOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                  {o.meta ? ` — ${o.meta}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={assignment?.pc_org_id ?? ''}
              onChange={(e) => {
                if (!assignmentId) return
                onChange(assignmentId, 'pc_org_id', e.target.value || null)
              }}
            >
              <option value="" disabled>
                Select an org…
              </option>
              {pcOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                  {o.meta ? ` — ${o.meta}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Position Title (STANDARDIZED DROPDOWN) */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--to-ink-muted)]">
            Position Title
          </label>

          {isCreate ? (
            <select
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={draft.position_title ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  position_title: e.target.value ? e.target.value : null,
                })
              }
            >
              <option value="">— Optional —</option>
              {positionTitles.map((t) => (
                <option key={t.id} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={assignment?.position_title ?? ''}
              onChange={(e) => {
                if (!assignmentId) return
                onChange(
                  assignmentId,
                  'position_title',
                  e.target.value ? e.target.value : null
                )
              }}
            >
              <option value="">— Optional —</option>
              {positionTitles.map((t) => (
                <option key={t.id} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tech ID */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--to-ink-muted)]">
            Tech ID
          </label>

          {isCreate ? (
            <input
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              placeholder="Existing system tech id (optional)"
              value={draft.tech_id ?? ''}
              onChange={(e) => setDraft({ ...draft, tech_id: e.target.value })}
            />
          ) : (
            <input
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={assignment?.tech_id ?? ''}
              onChange={(e) => {
                if (!assignmentId) return
                onChange(assignmentId, 'tech_id', e.target.value)
              }}
            />
          )}

          <div className="mt-1 text-[11px] text-[var(--to-ink-muted)]">
            Helpful for editing existing records when person linkage is incomplete.
          </div>
        </div>

        {/* Start Date */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--to-ink-muted)]">
            Start Date
          </label>

          {isCreate ? (
            <input
              type="date"
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={(draft.start_date ?? '').slice(0, 10)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  start_date: e.target.value ? e.target.value : null,
                })
              }
            />
          ) : (
            <input
              type="date"
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={(assignment?.start_date ?? '').slice(0, 10)}
              onChange={(e) => {
                if (!assignmentId) return
                onChange(
                  assignmentId,
                  'start_date',
                  e.target.value ? e.target.value : null
                )
              }}
            />
          )}
        </div>

        {/* End Date */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--to-ink-muted)]">
            End Date
          </label>

          {isCreate ? (
            <input
              type="date"
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={(draft.end_date ?? '').slice(0, 10)}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  end_date: e.target.value ? e.target.value : null,
                })
              }
            />
          ) : (
            <input
              type="date"
              className="w-full rounded border px-2 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={(assignment?.end_date ?? '').slice(0, 10)}
              onChange={(e) => {
                if (!assignmentId) return
                onChange(
                  assignmentId,
                  'end_date',
                  e.target.value ? e.target.value : null
                )
              }}
            />
          )}
        </div>
      </div>

      {/* Reporting (read-only, v1) */}
      {!isCreate ? (
        <div
          className="mt-6 rounded border p-4"
          style={{
            borderColor: 'var(--to-border)',
            background: 'var(--to-surface)',
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-[var(--to-ink)]">
                Org Chart Detail
              </div>
              <div className="mt-1 text-sm text-[var(--to-ink-muted)]">
                Source: <code>Leadership</code>
              </div>
            </div>

            {repLoading && (
              <div className="text-sm text-[var(--to-ink-muted)]">Loading…</div>
            )}
          </div>

          {repError && (
            <div
              className="mt-3 rounded border px-3 py-2 text-sm bg-white"
              style={{
                borderColor: 'var(--to-border)',
                color: 'var(--to-ink)',
              }}
            >
              <span className="font-semibold">Error:</span> {repError}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Parents */}
            <div>
              <div className="text-xs font-semibold text-[var(--to-ink-muted)]">
                Reports To
              </div>

              <div className="mt-2 space-y-2">
                {parents.length === 0 ? (
                  <div className="text-sm text-[var(--to-ink-muted)]">None</div>
                ) : (
                  parents.map((e) => (
                    <div
                      key={
                        e.assignment_leadership_id ??
                        `${e.parent_assignment_id}:${e.child_assignment_id}:${e.start_date}`
                      }
                      className="rounded border px-3 py-2 bg-white"
                      style={{ borderColor: 'var(--to-border)' }}
                    >
                      <div className="text-sm font-medium text-[var(--to-ink)]">
                        {assignmentLabel(e.parent)}
                      </div>
                      <div className="text-xs text-[var(--to-ink-muted)]">
                        {formatDate(e.start_date)} → {formatDate(e.end_date)} •{' '}
                        {e.active === false ? 'inactive' : 'active'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Children */}
            <div>
              <div className="text-xs font-semibold text-[var(--to-ink-muted)]">
                Direct Reports
              </div>

              <div className="mt-2 space-y-2">
                {children.length === 0 ? (
                  <div className="text-sm text-[var(--to-ink-muted)]">None</div>
                ) : (
                  children.map((e) => (
                    <div
                      key={
                        e.assignment_leadership_id ??
                        `${e.parent_assignment_id}:${e.child_assignment_id}:${e.start_date}`
                      }
                      className="rounded border px-3 py-2 bg-white"
                      style={{ borderColor: 'var(--to-border)' }}
                    >
                      <div className="text-sm font-medium text-[var(--to-ink)]">
                        {assignmentLabel(e.child)}
                      </div>
                      <div className="text-xs text-[var(--to-ink-muted)]">
                        {formatDate(e.start_date)} → {formatDate(e.end_date)} •{' '}
                        {e.active === false ? 'inactive' : 'active'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </AdminOverlay>
  )
}
