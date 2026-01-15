//apps/web/src/app/(prod)/person/PersonTable.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  fetchPersons,
  updatePersonEmployer,
  updatePersonCore,
  createPerson,
} from './person.api'
import { PersonRow } from './person.types'
import { fetchCompanyOptions, CompanyOption } from '../_shared/dropdowns'
import PersonInspector, {
  type EditableField,
  type CreatePersonInput,
  type PersonInspectorMode,
} from './PersonInspector'

type ActiveFilter = 'all' | 'active' | 'inactive'

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/* ---------- Status Pill (Ledger) ---------- */
const pillBase =
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium'

function StatusPill({ value }: { value: boolean | null }) {
  const isActive = value === true
  return (
    <span
      className={cx(
        pillBase,
        isActive
          ? 'bg-[var(--to-pill-active-bg)] text-[var(--to-pill-active-text)] border-[var(--to-pill-active-border)]'
          : 'bg-[var(--to-pill-inactive-bg)] text-[var(--to-pill-inactive-text)] border-[var(--to-pill-inactive-border)]'
      )}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

type CoreDraft = Partial<
  Pick<
    PersonRow,
    | 'full_name'
    | 'emails'
    | 'mobile'
    | 'fuse_emp_id'
    | 'person_nt_login'
    | 'person_csg_id'
    | 'person_notes'
  >
>

type EmployerDraft = Partial<Pick<PersonRow, 'role'>>

export default function PersonTable() {
  /* ---------------- Data ---------------- */
  const [rows, setRows] = useState<PersonRow[]>([])
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([])

  /* ---------------- UI State ---------------- */
  const [inlineEdit, setInlineEdit] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ActiveFilter>('all')

  /* ---------------- Inspector State ---------------- */
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] = useState<PersonInspectorMode>('edit')
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)

  /* ---------------- Draft (delayed commit) ---------------- */
  const [draftCoreById, setDraftCoreById] = useState<Record<string, CoreDraft>>(
    {}
  )
  const [draftEmployerById, setDraftEmployerById] = useState<
    Record<string, EmployerDraft>
  >({})

  /* ---------------- Bootstrap ---------------- */
  useEffect(() => {
    Promise.all([fetchPersons(), fetchCompanyOptions()]).then(
      ([people, companies]) => {
        setRows(people)
        setCompanyOptions(companies)
      }
    )
  }, [])

  /* ---------------- Derived ---------------- */
  const companyLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of companyOptions) {
      map.set(String(o.id), o.label)
    }
    return map
  }, [companyOptions])

  const selectedPersonBase = useMemo(() => {
    if (!selectedPersonId) return null
    return rows.find((r) => r.person_id === selectedPersonId) ?? null
  }, [rows, selectedPersonId])

  // Merge drafts into selected person for inspector edit UX (no DB writes until close)
  const selectedPerson = useMemo(() => {
    if (!selectedPersonBase) return null
    const pid = selectedPersonBase.person_id
    const core = draftCoreById[pid]
    const emp = draftEmployerById[pid]
    if (!core && !emp) return selectedPersonBase
    return {
      ...selectedPersonBase,
      ...(core ?? {}),
      ...(emp ?? {}),
    }
  }, [selectedPersonBase, draftCoreById, draftEmployerById])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()

    return rows.filter((r) => {
      const companyLabel =
        r.co_ref_id && companyLabelById.get(String(r.co_ref_id))
          ? companyLabelById.get(String(r.co_ref_id))!
          : ''

      const matchesSearch =
        r.full_name?.toLowerCase().includes(q) ||
        r.emails?.toLowerCase().includes(q) ||
        r.mobile?.toLowerCase().includes(q) ||
        r.co_code?.toLowerCase().includes(q) ||
        companyLabel.toLowerCase().includes(q)

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'active'
            ? r.active === true
            : r.active === false

      return matchesSearch && matchesStatus
    })
  }, [rows, search, statusFilter, companyLabelById])

  function getCoreDraftValue<K extends keyof CoreDraft>(
    personId: string,
    key: K,
    fallback: any
  ) {
    const d = draftCoreById[personId]
    if (!d) return fallback
    const v = d[key]
    return v === undefined ? fallback : v
  }

  function getEmployerDraftValue<K extends keyof EmployerDraft>(
    personId: string,
    key: K,
    fallback: any
  ) {
    const d = draftEmployerById[personId]
    if (!d) return fallback
    const v = d[key]
    return v === undefined ? fallback : v
  }

  async function commitDraftEdits(personIds?: string[]) {
    const ids =
      personIds && personIds.length > 0
        ? Array.from(new Set(personIds))
        : Array.from(
          new Set([
            ...Object.keys(draftCoreById),
            ...Object.keys(draftEmployerById),
          ])
        )

    if (ids.length === 0) return

    for (const personId of ids) {
      const base = rows.find((r) => r.person_id === personId)
      if (!base) continue

      const coreDraft = draftCoreById[personId]
      const empDraft = draftEmployerById[personId]

      let latest: PersonRow = base

      // commit core draft (single call per person)
      if (coreDraft && Object.keys(coreDraft).length > 0) {
        const updatedCore = await updatePersonCore(personId, coreDraft)
        latest = updatedCore
        setRows((prev) =>
          prev.map((r) => (r.person_id === updatedCore.person_id ? updatedCore : r))
        )
      }

      // commit employer draft (role only; co_ref_id/co_code required by API signature)
      if (empDraft && Object.keys(empDraft).length > 0) {
        const updatedEmp = await updatePersonEmployer(personId, {
          co_ref_id: latest.co_ref_id ?? null,
          co_code: latest.co_code ?? null,
          active: latest.active ?? null,
          role:
            empDraft.role === undefined ? (latest.role ?? null) : (empDraft.role ?? null),
        })
        latest = updatedEmp
        setRows((prev) =>
          prev.map((r) => (r.person_id === updatedEmp.person_id ? updatedEmp : r))
        )
      }
    }

    // clear committed drafts
    setDraftCoreById((prev) => {
      const next = { ...prev }
      for (const id of ids) delete next[id]
      return next
    })
    setDraftEmployerById((prev) => {
      const next = { ...prev }
      for (const id of ids) delete next[id]
      return next
    })
  }

  /* ---------------- Mutations ---------------- */
  async function updateField(personId: string, field: EditableField, value: any) {
    const target = rows.find((r) => r.person_id === personId)
    if (!target) return

    // Discrete, safe-to-refresh fields (immediate DB write)
    if (field === 'co_ref_id' || field === 'active') {
      const payload: Partial<PersonRow> = {
        ...target,
        [field]: value,
      }

      if (field === 'co_ref_id') {
        const selected = companyOptions.find((o) => String(o.id) === String(value))
        payload.co_code = selected?.code ?? null
      }

      const updated = await updatePersonEmployer(personId, {
        co_ref_id: payload.co_ref_id ?? null,
        co_code: payload.co_code ?? null,
        active: payload.active ?? null,
        role: target.role ?? null,
      })

      setRows((prev) =>
        prev.map((r) => (r.person_id === updated.person_id ? updated : r))
      )
      return
    }

    // Role is free-text in this surface → stage it, commit on exit
    if (field === 'role') {
      setDraftEmployerById((prev) => ({
        ...prev,
        [personId]: {
          ...(prev[personId] ?? {}),
          role: value ?? null,
        },
      }))
      return
    }

    // Core free-text fields → stage, commit on exit
    if (
      field === 'full_name' ||
      field === 'emails' ||
      field === 'mobile' ||
      field === 'fuse_emp_id' ||
      field === 'person_nt_login' ||
      field === 'person_csg_id' ||
      field === 'person_notes'
    ) {
      setDraftCoreById((prev) => ({
        ...prev,
        [personId]: {
          ...(prev[personId] ?? {}),
          [field]: value ?? null,
        } as CoreDraft,
      }))
      return
    }
  }

  /* ---------------- Inspector Triggers ---------------- */
  function onAddPerson() {
    setInspectorMode('create')
    setSelectedPersonId(null)
    setInspectorOpen(true)
  }

  function onOpenEdit(personId: string) {
    if (inlineEdit) return
    setInspectorMode('edit')
    setSelectedPersonId(personId)
    setInspectorOpen(true)
  }

  async function onCreate(
    payload: CreatePersonInput,
    options?: { allowDuplicateFuse?: boolean }
  ) {
    const res = await createPerson(payload, options)
    if (res.type === 'created') {
      setRows((prev) => [...prev, res.row])
    }
    return res
  }

  async function onInspectorClose(reason: 'close' | 'cancel' | 'created') {
    // Only commit drafts on edit-close; never on create cancel/created
    if (inspectorMode === 'edit' && selectedPersonId && reason === 'close') {
      await commitDraftEdits([selectedPersonId])
    }

    setInspectorOpen(false)
    setSelectedPersonId(null)
    setInspectorMode('edit')
  }

  /* ---------------- Visual Tokens ---------------- */
  const th =
    'px-3 py-2 text-[11px] font-semibold uppercase tracking-wide border-b'
  const td = 'px-3 py-2 align-top border-b'

  /* ---------------- Render ---------------- */
  return (
    <div className="flex h-full flex-col">
      {/* HEADER */}
      <div
        className={cx(
          'border-b px-6 py-4',
          inlineEdit ? 'bg-[var(--to-green-100)]' : 'bg-[var(--to-blue-050)]'
        )}
        style={{ borderColor: 'var(--to-border)' }}
      >
        <div className="flex items-start justify-between gap-6">
          {/* Left */}
          <div>
            <h2 className="text-sm font-semibold text-[var(--to-header-title)]">
              People — Admin Ledger
            </h2>
            <p className="text-xs text-[var(--to-ink-muted)]">
              {inlineEdit
                ? 'Bulk Edit Mode Active — changes apply immediately'
                : 'Scan, filter, and open records. Enable bulk edit to modify.'}
            </p>
          </div>

          {/* Right Controls */}
          <div className="flex flex-col gap-2 items-end">
            {/* Filters */}
            <div className="flex items-center gap-2">
              {(['all', 'active', 'inactive'] as ActiveFilter[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setStatusFilter(k)}
                  className={cx(
                    'rounded-full border px-3 py-1 text-xs',
                    statusFilter === k
                      ? 'bg-[var(--to-blue-600)] text-white'
                      : 'bg-white'
                  )}
                  style={{ borderColor: 'var(--to-border)' }}
                >
                  {k === 'all'
                    ? 'All'
                    : k === 'active'
                      ? 'Active'
                      : 'Inactive'}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <input
                placeholder="Search name, email, mobile, company…"
                className="w-72 rounded border px-2 py-1 text-sm"
                style={{ borderColor: 'var(--to-border)' }}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              <button
                onClick={onAddPerson}
                disabled={inlineEdit}
                className="rounded px-3 py-1.5 text-sm border bg-white"
                style={{ borderColor: 'var(--to-border)' }}
              >
                Add
              </button>

              <button
                onClick={async () => {
                  // exiting bulk edit → commit all staged drafts
                  if (inlineEdit) {
                    await commitDraftEdits()
                  }

                  setInlineEdit((v) => !v)

                  // preserving existing behavior
                  if (!inlineEdit) {
                    setInspectorOpen(false)
                    setSelectedPersonId(null)
                  }
                }}
                className={cx(
                  'rounded px-3 py-1.5 text-sm border',
                  inlineEdit ? 'bg-[var(--to-green-600)] text-white' : 'bg-white'
                )}
                style={{ borderColor: 'var(--to-border)' }}
              >
                {inlineEdit ? 'Exit Bulk Edit' : 'Bulk Edit'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LEDGER */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-[var(--to-surface)] z-10">
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Email</th>
              <th className={th}>Mobile</th>
              <th className={th}>Company</th>
              <th className={th}>Code</th>
              <th className={th}>Active</th>
              <th className={th}>Role</th>
              <th className={th}>Fuse</th>
              <th className={th}>NT</th>
              <th className={th}>CSG</th>
              <th className={th}>Notes</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r, idx) => {
              const companyLabel =
                r.co_ref_id && companyLabelById.get(String(r.co_ref_id))
                  ? companyLabelById.get(String(r.co_ref_id))!
                  : '—'

              const nameValue = getCoreDraftValue(
                r.person_id,
                'full_name',
                r.full_name ?? ''
              ) as string

              const emailsValue = getCoreDraftValue(
                r.person_id,
                'emails',
                r.emails ?? ''
              ) as string

              const mobileValue = getCoreDraftValue(
                r.person_id,
                'mobile',
                r.mobile ?? ''
              ) as string

              const roleValue = getEmployerDraftValue(
                r.person_id,
                'role',
                r.role ?? ''
              ) as string

              const fuseValue = getCoreDraftValue(
                r.person_id,
                'fuse_emp_id',
                r.fuse_emp_id ?? ''
              ) as string

              const ntValue = getCoreDraftValue(
                r.person_id,
                'person_nt_login',
                r.person_nt_login ?? ''
              ) as string

              const csgValue = getCoreDraftValue(
                r.person_id,
                'person_csg_id',
                r.person_csg_id ?? ''
              ) as string

              const notesValue = getCoreDraftValue(
                r.person_id,
                'person_notes',
                r.person_notes ?? ''
              ) as string

              return (
                <tr
                  key={r.person_id}
                  className={cx(
                    inlineEdit
                      ? 'hover:bg-[var(--to-green-050)]'
                      : 'hover:bg-[var(--to-row-hover)]'
                  )}
                  style={{
                    background:
                      idx % 2 === 0
                        ? 'var(--to-surface)'
                        : 'var(--to-surface-soft)',
                  }}
                >
                  {/* NAME */}
                  <td className={td}>
                    {inlineEdit ? (
                      <input
                        className="w-full rounded border px-2 py-1"
                        style={{ borderColor: 'var(--to-border)' }}
                        value={nameValue}
                        onChange={(e) =>
                          updateField(r.person_id, 'full_name', e.target.value)
                        }
                      />
                    ) : (
                      <div
                        className="cursor-pointer rounded px-1 py-0.5 hover:bg-[var(--to-blue-100)]"
                        onClick={() => onOpenEdit(r.person_id)}
                      >
                        {r.full_name ?? '—'}
                      </div>
                    )}
                  </td>

                  <td className={td}>
                    {inlineEdit ? (
                      <input
                        className="w-full rounded border px-2 py-1"
                        style={{ borderColor: 'var(--to-border)' }}
                        value={emailsValue}
                        onChange={(e) =>
                          updateField(r.person_id, 'emails', e.target.value)
                        }
                      />
                    ) : (
                      r.emails
                    )}
                  </td>

                  <td className={td}>
                    {inlineEdit ? (
                      <input
                        className="w-full rounded border px-2 py-1"
                        style={{ borderColor: 'var(--to-border)' }}
                        value={mobileValue}
                        onChange={(e) =>
                          updateField(r.person_id, 'mobile', e.target.value)
                        }
                      />
                    ) : (
                      r.mobile
                    )}
                  </td>

                  <td className={td}>
                    {inlineEdit ? (
                      <select
                        className="w-full rounded border px-2 py-1"
                        style={{ borderColor: 'var(--to-border)' }}
                        value={r.co_ref_id ?? ''}
                        onChange={(e) =>
                          updateField(
                            r.person_id,
                            'co_ref_id',
                            e.target.value || null
                          )
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
                      companyLabel
                    )}
                  </td>

                  <td className={td}>{r.co_code ?? '—'}</td>

                  <td className={td}>
                    {inlineEdit ? (
                      <button
                        className={cx(
                          pillBase,
                          r.active === true
                            ? 'bg-[var(--to-pill-active-bg)] text-[var(--to-pill-active-text)] border-[var(--to-pill-active-border)]'
                            : 'bg-[var(--to-pill-inactive-bg)] text-[var(--to-pill-inactive-text)] border-[var(--to-pill-inactive-border)]'
                        )}
                        onClick={() =>
                          updateField(
                            r.person_id,
                            'active',
                            r.active === true ? false : true
                          )
                        }
                      >
                        {r.active ? 'Active' : 'Inactive'}
                      </button>
                    ) : (
                      <StatusPill value={r.active} />
                    )}
                  </td>

                  <td className={td}>
                    {inlineEdit ? (
                      <input
                        className="w-full rounded border px-2 py-1"
                        style={{ borderColor: 'var(--to-border)' }}
                        value={roleValue}
                        onChange={(e) =>
                          updateField(r.person_id, 'role', e.target.value)
                        }
                      />
                    ) : (
                      r.role
                    )}
                  </td>

                  <td className={td}>
                    {inlineEdit ? (
                      <input
                        className="w-full rounded border px-2 py-1 text-xs"
                        style={{ borderColor: 'var(--to-border)' }}
                        value={fuseValue}
                        onChange={(e) =>
                          updateField(r.person_id, 'fuse_emp_id', e.target.value)
                        }
                      />
                    ) : (
                      r.fuse_emp_id
                    )}
                  </td>

                  <td className={td}>
                    {inlineEdit ? (
                      <input
                        className="w-full rounded border px-2 py-1 text-xs"
                        style={{ borderColor: 'var(--to-border)' }}
                        value={ntValue}
                        onChange={(e) =>
                          updateField(
                            r.person_id,
                            'person_nt_login',
                            e.target.value
                          )
                        }
                      />
                    ) : (
                      r.person_nt_login
                    )}
                  </td>

                  <td className={td}>
                    {inlineEdit ? (
                      <input
                        className="w-full rounded border px-2 py-1 text-xs"
                        style={{ borderColor: 'var(--to-border)' }}
                        value={csgValue}
                        onChange={(e) =>
                          updateField(
                            r.person_id,
                            'person_csg_id',
                            e.target.value
                          )
                        }
                      />
                    ) : (
                      r.person_csg_id
                    )}
                  </td>

                  <td className={td}>
                    {inlineEdit ? (
                      <textarea
                        className="w-full rounded border px-2 py-1 text-xs"
                        rows={2}
                        style={{ borderColor: 'var(--to-border)' }}
                        value={notesValue}
                        onChange={(e) =>
                          updateField(
                            r.person_id,
                            'person_notes',
                            e.target.value
                          )
                        }
                      />
                    ) : (
                      r.person_notes
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* INSPECTOR */}
      <PersonInspector
        open={inspectorOpen}
        mode={inspectorMode}
        person={inspectorMode === 'edit' ? selectedPerson : null}
        companyOptions={companyOptions}
        companyLabelById={companyLabelById}
        onChange={updateField}
        onCreate={onCreate}
        onReviewExisting={(personId) => {
          setInspectorMode('edit')
          setSelectedPersonId(personId)
          setInspectorOpen(true)
        }}
        onClose={onInspectorClose}
      />
    </div>
  )
}
