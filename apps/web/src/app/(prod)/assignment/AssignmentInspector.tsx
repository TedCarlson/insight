'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import AdminOverlay from '../_shared/AdminOverlay'
import { toBtnNeutral, toBtnPrimary } from '../_shared/toStyles'
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
      const defaultTitle = positionTitles?.[0]?.label ?? null

      setDraft({
        person_id: null,
        pc_org_id: null,
        tech_id: null,
        // REQUIRED: default to first governed option to prevent null/orphan workflows
        position_title: defaultTitle,
        start_date: null,
        end_date: null,
      })
    }
  }, [open, isCreate, positionTitles])

  // Load reporting edges when editing
  useEffect(() => {
    if (!open) return
    if (isCreate) return
    if (!assignmentId) return

    let alive = true
      ; (async () => {
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

  const canCreate =
    !!draft.person_id &&
    !!draft.pc_org_id &&
    !!draft.position_title &&
    !!draft.start_date &&
    !saving

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
    if (!draft.position_title) {
      // REQUIRED: position_title must be set now that DB integrity is enforced
      setSubmitError('Position Title is required.')
      return
    }

    setSaving(true)
    try {
      await onCreate({
        person_id: draft.person_id,
        pc_org_id: draft.pc_org_id,
        tech_id: draft.tech_id ?? null,
        position_title: draft.position_title,
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
              className={toBtnNeutral}
              onClick={() => onClose('cancel')}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className={cn(toBtnPrimary, "disabled:opacity-60")}
              disabled={!canCreate}
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
          className="mb-4 rounded border px-3 py-2 text-sm border-[var(--to-border)] bg-[var(--to-surface)] text-[var(--to-ink)]"
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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

        {/* Position Title (REQUIRED, GOVERNED) */}
        <div>
          <label className="block text-xs font-semibold mb-1 text-[var(--to-ink-muted)]">
            Position Title
          </label>

          {isCreate ? (
            <select
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
              value={draft.position_title ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  position_title: e.target.value || null,
                })
              }
            >
              {positionTitles.length === 0 ? (
                <option value="" disabled>
                  No position titles available…
                </option>
              ) : null}

              {positionTitles.map((t) => (
                <option key={t.id} value={t.label}>
                  {t.label}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
              value={assignment?.position_title ?? ''}
              onChange={(e) => {
                if (!assignmentId) return
                // Prevent clearing to blank; only allow valid governed values.
                const next = e.target.value || null
                if (!next) return
                onChange(assignmentId, 'position_title', next)
              }}
            >
              <option value="" disabled>
                Select a title…
              </option>
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
              placeholder="Existing system tech id (optional)"
              value={draft.tech_id ?? ''}
              onChange={(e) => setDraft({ ...draft, tech_id: e.target.value })}
            />
          ) : (
            <input
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
              className="w-full rounded border px-2 py-2 text-sm bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
          className="mt-6 rounded border p-4 border-[var(--to-border)] bg-[var(--to-surface)]"
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
              className="mt-3 rounded border px-3 py-2 text-sm border-[var(--to-border)] bg-[var(--to-surface)] text-[var(--to-ink)]"
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
                      className="rounded border px-3 py-2 bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
                      className="rounded border px-3 py-2 bg-[var(--to-surface)] border-[var(--to-border)] text-[var(--to-ink)] placeholder:text-[var(--to-ink-muted)]"
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
