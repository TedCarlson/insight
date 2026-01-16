'use client'

import { useEffect, useMemo, useState } from 'react'
import type { PersonRow } from './person.types'
import type { CompanyOption } from '../_shared/dropdowns'
import AdminOverlay from '../_shared/AdminOverlay'

export type PersonInspectorMode = 'create' | 'edit'

export type EditableField =
  | 'full_name'
  | 'emails'
  | 'mobile'
  | 'co_ref_id'
  | 'active'
  | 'role'
  | 'person_notes'
  | 'fuse_emp_id'
  | 'person_nt_login'
  | 'person_csg_id'

export type CreatePersonInput = {
  full_name: string
  emails?: string | null
  mobile?: string | null
  co_ref_id?: string | null
  active?: boolean | null
  role?: string | null
  fuse_emp_id?: string | null
  person_nt_login?: string | null
  person_csg_id?: string | null
  person_notes?: string | null
}

export type CreateResult =
  | { type: 'duplicate'; matches: PersonRow[] }
  | { type: 'created'; row: PersonRow }

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

const pillBase =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium'

function StatusPill({
  value,
  interactive,
  onClick,
}: {
  value: boolean | null
  interactive?: boolean
  onClick?: () => void
}) {
  const isActive = value === true
  return (
    <span
      onClick={interactive ? onClick : undefined}
      className={cx(
        pillBase,
        isActive
          ? 'bg-[var(--to-pill-active-bg)] text-[var(--to-pill-active-text)] border-[var(--to-pill-active-border)]'
          : 'bg-[var(--to-pill-inactive-bg)] text-[var(--to-pill-inactive-text)] border-[var(--to-pill-inactive-border)]',
        interactive && 'cursor-pointer select-none'
      )}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
      {children}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <input
        disabled={disabled}
        className={cx(
          'w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-offset-0',
          disabled && 'bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)]',
          !disabled && 'bg-white',
          'focus:ring-[var(--to-blue-600)] focus:border-[var(--to-blue-600)]'
        )}
        style={{ borderColor: 'var(--to-border)' }}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
}) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--to-blue-600)] focus:border-[var(--to-blue-600)] bg-white"
        style={{ borderColor: 'var(--to-border)' }}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-[var(--to-ink)]">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

export default function PersonInspector(props: {
  open: boolean
  mode: PersonInspectorMode
  person?: PersonRow | null
  companyOptions: CompanyOption[]
  companyLabelById: Map<string, string>
  onChange: (personId: string, field: EditableField, value: any) => void
  onCreate: (
    payload: CreatePersonInput,
    options?: { allowDuplicateFuse?: boolean }
  ) => Promise<CreateResult>
  onReviewExisting: (personId: string) => void
  onClose: (reason: 'close' | 'cancel' | 'created') => void
}) {
  const {
    open,
    mode,
    person,
    companyOptions,
    companyLabelById,
    onChange,
    onCreate,
    onReviewExisting,
    onClose,
  } = props

  const isCreate = mode === 'create'
  const title = isCreate ? 'Add Person' : 'Edit Person'

  // ----- Create-mode draft -----
  const [draft, setDraft] = useState<CreatePersonInput>({
    full_name: '',
    emails: null,
    mobile: null,
    co_ref_id: null,
    active: true,
    role: null,
    fuse_emp_id: null,
    person_nt_login: null,
    person_csg_id: null,
    person_notes: null,
  })

  // duplicate advisory
  const [dupMatches, setDupMatches] = useState<PersonRow[]>([])
  const [dupModalOpen, setDupModalOpen] = useState(false)
  const [allowDupFuse, setAllowDupFuse] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (isCreate) {
      setDraft({
        full_name: '',
        emails: null,
        mobile: null,
        co_ref_id: null,
        active: true,
        role: null,
        fuse_emp_id: null,
        person_nt_login: null,
        person_csg_id: null,
        person_notes: null,
      })
      setDupMatches([])
      setDupModalOpen(false)
      setAllowDupFuse(false)
      setSubmitError(null)
      setSaving(false)
    } else {
      setDupMatches([])
      setDupModalOpen(false)
      setAllowDupFuse(false)
      setSubmitError(null)
      setSaving(false)
    }
  }, [open, isCreate])

  const displayCompanyForEdit = useMemo(() => {
    if (!person?.co_ref_id) return '—'
    return companyLabelById.get(String(person.co_ref_id)) ?? '—'
  }, [companyLabelById, person?.co_ref_id])

  const displayCompanyForCreate = useMemo(() => {
    if (!draft.co_ref_id) return '—'
    return companyLabelById.get(String(draft.co_ref_id)) ?? '—'
  }, [companyLabelById, draft.co_ref_id])

  async function runFuseAdvisoryCheck(force = false) {
    if (!isCreate) return
    const fuse = (draft.fuse_emp_id ?? '').trim()
    if (!fuse) {
      setDupMatches([])
      setDupModalOpen(false)
      setAllowDupFuse(false)
      return
    }
    if (allowDupFuse && !force) return
    try {
      const res = await onCreate(draft, { allowDuplicateFuse: allowDupFuse })
      if (res.type === 'duplicate') {
        setDupMatches(res.matches)
      } else {
        setDupMatches([])
      }
    } catch {
      // advisory should not hard-fail
    }
  }

  async function handleSave() {
    if (!isCreate) return
    setSubmitError(null)

    const name = (draft.full_name ?? '').trim()
    if (!name) {
      setSubmitError('Full name is required.')
      return
    }

    setSaving(true)
    try {
      const res = await onCreate(draft, { allowDuplicateFuse: allowDupFuse })

      if (res.type === 'duplicate') {
        setDupMatches(res.matches)
        setDupModalOpen(true)
        setSaving(false)
        return
      }

      onClose('created')
    } catch (e: any) {
      setSubmitError(e?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <AdminOverlay
      open={open}
      mode={mode}
      title={title}
      subtitle={
        isCreate
          ? 'Create a new person record'
          : 'Zoomed edit surface (writes apply immediately)'
      }
      onClose={() => onClose(isCreate ? 'cancel' : 'close')}
      footer={
        isCreate ? (
          <div className="flex items-center justify-between gap-3">
            <button
              className="rounded border px-3 py-1.5 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              onClick={() => onClose('cancel')}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              className={cx(
                'rounded px-3 py-1.5 text-sm border',
                saving
                  ? 'bg-white text-[var(--to-ink-muted)]'
                  : 'bg-[var(--to-blue-600)] text-white'
              )}
              style={{ borderColor: 'var(--to-btn-primary-border)' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save & Close'}
            </button>
          </div>
        ) : null
      }
    >
      {/* Body (original content; no longer forces bg-white on the entire panel) */}
      <div className="space-y-6">
        {/* Identity */}
        <Section title="Identity">
          {isCreate ? (
            <TextField
              label="Full name"
              value={draft.full_name ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, full_name: v }))}
              placeholder="Full name"
            />
          ) : (
            <TextField
              label="Full name"
              value={person?.full_name ?? ''}
              onChange={(v) => person && onChange(person.person_id, 'full_name', v)}
              placeholder="Full name"
            />
          )}
        </Section>

        {/* Contact */}
        <Section title="Contact">
          {isCreate ? (
            <>
              <TextField
                label="Emails"
                value={draft.emails ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, emails: v || null }))}
                placeholder="email@domain.com"
              />
              <TextField
                label="Mobile"
                value={draft.mobile ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, mobile: v || null }))}
                placeholder="(###) ###-####"
              />
            </>
          ) : (
            <>
              <TextField
                label="Emails"
                value={person?.emails ?? ''}
                onChange={(v) =>
                  person && onChange(person.person_id, 'emails', v || null)
                }
                placeholder="email@domain.com"
              />
              <TextField
                label="Mobile"
                value={person?.mobile ?? ''}
                onChange={(v) =>
                  person && onChange(person.person_id, 'mobile', v || null)
                }
                placeholder="(###) ###-####"
              />
            </>
          )}
        </Section>

        {/* Org / Employer */}
        <Section title="Org / Employer">
          <div className="space-y-1">
            <FieldLabel>Company</FieldLabel>
            {isCreate ? (
              <select
                className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--to-blue-600)] focus:border-[var(--to-blue-600)] bg-white"
                style={{ borderColor: 'var(--to-border)' }}
                value={draft.co_ref_id ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, co_ref_id: e.target.value || null }))
                }
              >
                <option value="">— Unassigned —</option>
                {companyOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                className="w-full rounded border px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-offset-0 focus:ring-[var(--to-blue-600)] focus:border-[var(--to-blue-600)] bg-white"
                style={{ borderColor: 'var(--to-border)' }}
                value={person?.co_ref_id ?? ''}
                onChange={(e) =>
                  person &&
                  onChange(person.person_id, 'co_ref_id', e.target.value || null)
                }
              >
                <option value="">— Unassigned —</option>
                {companyOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1">
            <FieldLabel>Company code (derived)</FieldLabel>
            <div
              className="rounded border px-2 py-1.5 text-sm bg-[var(--to-surface-soft)] text-[var(--to-ink-muted)]"
              style={{ borderColor: 'var(--to-border)' }}
            >
              {isCreate ? displayCompanyForCreate ?? '—' : displayCompanyForEdit ?? '—'}
            </div>
          </div>

          <div className="text-xs text-[var(--to-ink-muted)]">
            Company display is derived from the selected employer.
          </div>
        </Section>

        {/* Status / Role */}
        <Section title="Status / Role">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1 flex-1">
              <FieldLabel>Active</FieldLabel>
              {isCreate ? (
                <StatusPill
                  value={draft.active ?? true}
                  interactive
                  onClick={() =>
                    setDraft((d) => ({ ...d, active: !(d.active ?? true) }))
                  }
                />
              ) : (
                <StatusPill
                  value={person?.active ?? false}
                  interactive
                  onClick={() =>
                    person &&
                    onChange(person.person_id, 'active', !(person.active === true))
                  }
                />
              )}
            </div>

            <div className="flex-[2]">
              {isCreate ? (
                <TextField
                  label="Role"
                  value={draft.role ?? ''}
                  onChange={(v) => setDraft((d) => ({ ...d, role: v || null }))}
                  placeholder="Role"
                />
              ) : (
                <TextField
                  label="Role"
                  value={person?.role ?? ''}
                  onChange={(v) => person && onChange(person.person_id, 'role', v || null)}
                  placeholder="Role"
                />
              )}
            </div>
          </div>
        </Section>

        {/* Program / System IDs */}
        <Section title="Program / System IDs">
          {isCreate ? (
            <>
              <TextField
                label="Fuse employee ID"
                value={draft.fuse_emp_id ?? ''}
                onChange={(v) => {
                  setDraft((d) => ({ ...d, fuse_emp_id: v || null }))
                  setAllowDupFuse(false)
                }}
                placeholder="Fuse employee ID"
                disabled={saving}
              />

              {dupMatches.length > 0 ? (
                <div
                  className="rounded border px-3 py-2 text-xs"
                  style={{
                    borderColor: 'var(--to-pill-inactive-border)',
                    background: 'var(--to-pill-inactive-bg)',
                    color: 'var(--to-pill-inactive-text)',
                  }}
                >
                  <div className="font-semibold">Fuse ID already exists</div>
                  <div className="mt-1 text-[11px]">
                    Review the existing record before creating a duplicate.
                  </div>

                  <div className="mt-2 space-y-2">
                    {dupMatches.slice(0, 5).map((m) => (
                      <div
                        key={m.person_id}
                        className="flex items-center justify-between gap-3 rounded border px-2 py-1.5 bg-white/70"
                        style={{ borderColor: 'var(--to-border)' }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[var(--to-ink)] truncate">
                            {m.full_name ?? '—'}
                          </div>
                          <div className="text-[11px] text-[var(--to-ink-muted)] truncate">
                            {m.co_ref_id
                              ? companyLabelById.get(String(m.co_ref_id)) ?? '—'
                              : '—'}
                          </div>
                        </div>
                        <StatusPill value={m.active ?? false} />
                        <button
                          className="rounded border px-2 py-1 text-xs bg-white"
                          style={{ borderColor: 'var(--to-border)' }}
                          onClick={() => onReviewExisting(m.person_id)}
                        >
                          Review
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button
                      className="rounded border px-2 py-1 text-xs bg-white"
                      style={{ borderColor: 'var(--to-border)' }}
                      onClick={() => setDupModalOpen(true)}
                    >
                      Resolve…
                    </button>
                    <button
                      className="rounded border px-2 py-1 text-xs bg-white"
                      style={{ borderColor: 'var(--to-border)' }}
                      onClick={() => runFuseAdvisoryCheck(true)}
                    >
                      Re-check
                    </button>
                  </div>
                </div>
              ) : null}

              <TextField
                label="NT login"
                value={draft.person_nt_login ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, person_nt_login: v || null }))}
                placeholder="NT login"
                disabled={saving}
              />
              <TextField
                label="CSG ID"
                value={draft.person_csg_id ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, person_csg_id: v || null }))}
                placeholder="CSG ID"
                disabled={saving}
              />
            </>
          ) : (
            <>
              <TextField
                label="Fuse employee ID"
                value={person?.fuse_emp_id ?? ''}
                onChange={(v) => person && onChange(person.person_id, 'fuse_emp_id', v || null)}
                placeholder="Fuse employee ID"
              />
              <TextField
                label="NT login"
                value={person?.person_nt_login ?? ''}
                onChange={(v) => person && onChange(person.person_id, 'person_nt_login', v || null)}
                placeholder="NT login"
              />
              <TextField
                label="CSG ID"
                value={person?.person_csg_id ?? ''}
                onChange={(v) => person && onChange(person.person_id, 'person_csg_id', v || null)}
                placeholder="CSG ID"
              />
            </>
          )}
        </Section>

        {/* Notes */}
        <Section title="Notes">
          {isCreate ? (
            <TextAreaField
              label="Notes"
              value={draft.person_notes ?? ''}
              onChange={(v) => setDraft((d) => ({ ...d, person_notes: v || null }))}
              rows={5}
            />
          ) : (
            <TextAreaField
              label="Notes"
              value={person?.person_notes ?? ''}
              onChange={(v) => person && onChange(person.person_id, 'person_notes', v || null)}
              rows={5}
            />
          )}
        </Section>

        {submitError ? (
          <div
            className="rounded border px-3 py-2 text-xs"
            style={{
              borderColor: 'var(--to-pill-inactive-border)',
              background: 'var(--to-pill-inactive-bg)',
              color: 'var(--to-pill-inactive-text)',
            }}
          >
            {submitError}
          </div>
        ) : null}
      </div>

      {/* Duplicate modal (kept; click-off not used) */}
      {isCreate && dupModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/35" />
          <div
            className="relative w-[640px] max-w-[90%] rounded border bg-[var(--to-surface)] shadow-[var(--to-shadow-md)]"
            style={{ borderColor: 'var(--to-border)' }}
          >
            <div className="border-b px-4 py-3" style={{ borderColor: 'var(--to-border)' }}>
              <div className="text-sm font-semibold text-[var(--to-ink)]">
                Duplicate Fuse ID Detected
              </div>
              <div className="text-xs text-[var(--to-ink-muted)]">
                An existing record already uses this Fuse ID. Review before creating a duplicate.
              </div>
            </div>

            <div className="px-4 py-3 space-y-2 max-h-[260px] overflow-auto">
              {dupMatches.map((m) => (
                <button
                  key={m.person_id}
                  className="w-full text-left rounded border px-3 py-2 bg-white hover:bg-[var(--to-blue-050)]"
                  style={{ borderColor: 'var(--to-border)' }}
                  onClick={() => onReviewExisting(m.person_id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[var(--to-ink)] truncate">
                        {m.full_name ?? '—'}
                      </div>
                      <div className="text-[11px] text-[var(--to-ink-muted)] truncate">
                        {m.co_ref_id ? companyLabelById.get(String(m.co_ref_id)) ?? '—' : '—'}
                      </div>
                    </div>
                    <StatusPill value={m.active ?? false} />
                  </div>
                </button>
              ))}
            </div>

            <div
              className="border-t px-4 py-3 flex items-center justify-between gap-2"
              style={{ borderColor: 'var(--to-border)' }}
            >
              <button
                className="rounded border px-3 py-1.5 text-sm bg-white"
                style={{ borderColor: 'var(--to-border)' }}
                onClick={() => setDupModalOpen(false)}
              >
                Cancel
              </button>

              <button
                className="rounded border px-3 py-1.5 text-sm bg-white"
                style={{ borderColor: 'var(--to-border)' }}
                onClick={() => {
                  setAllowDupFuse(true)
                  setDupModalOpen(false)
                }}
              >
                Create Anyway
              </button>

              <button
                className="rounded px-3 py-1.5 text-sm bg-[var(--to-blue-600)] text-white border"
                style={{ borderColor: 'var(--to-btn-primary-border)' }}
                onClick={() => {
                  if (dupMatches[0]) onReviewExisting(dupMatches[0].person_id)
                }}
              >
                Review Existing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminOverlay>
  )
}
