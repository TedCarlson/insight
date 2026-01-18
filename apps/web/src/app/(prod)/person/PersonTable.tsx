'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchPersons,
  updatePersonEmployer,
  updatePersonCore, // <-- include here
  createPerson
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

export default function PersonTable() {
  /* ---------------- Data ---------------- */
  const [rows, setRows] = useState<PersonRow[]>([])
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([])

  /* ---------------- Debounced Writes ---------------- */
  const WRITE_DELAY_MS = 600
  const writeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const writeSeq = useRef<Map<string, number>>(new Map())

  /* ---------------- UI State ---------------- */
  const [inlineEdit, setInlineEdit] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] =
    useState<ActiveFilter>('all')

  /* ---------------- Inspector State ---------------- */
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorMode, setInspectorMode] =
    useState<PersonInspectorMode>('edit')
  const [selectedPersonId, setSelectedPersonId] =
    useState<string | null>(null)

  /* ---------------- Bootstrap ---------------- */
  useEffect(() => {
    Promise.all([fetchPersons(), fetchCompanyOptions()]).then(
      ([people, companies]) => {
        setRows(people)
        setCompanyOptions(companies)
      }
    )
  }, [])

  useEffect(() => {
  const timers = writeTimers.current;

  return () => {
    for (const timer of timers.values()) clearTimeout(timer);
  };
}, []);



  /* ---------------- Derived ---------------- */
  const companyLabelById = useMemo(() => {
    const map = new Map<string, string>()
    for (const o of companyOptions) {
      map.set(String(o.id), o.label)
    }
    return map
  }, [companyOptions])

  const selectedPerson = useMemo(() => {
    if (!selectedPersonId) return null
    return rows.find((r) => r.person_id === selectedPersonId) ?? null
  }, [rows, selectedPersonId])

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

  /* ---------------- Mutations ---------------- */
  function updateField(
    personId: string,
    field: EditableField,
    value: any
  ) {
    // 1) Optimistic update: keep inputs responsive
    setRows((prev) =>
      prev.map((r) => {
        if (r.person_id !== personId) return r
        const next = { ...r, [field]: value } as PersonRow

        // keep derived code display updated when company changes
        if (field === 'co_ref_id') {
          const selected = companyOptions.find(
            (o) => String(o.id) === String(value)
          )
          next.co_code = selected?.code ?? null
        }

        return next
      })
    )

    // 2) Debounce DB write per person+field
    const key = `${personId}:${field}`
    const prior = writeTimers.current.get(key)
    if (prior) clearTimeout(prior)

    const seq = (writeSeq.current.get(key) ?? 0) + 1
    writeSeq.current.set(key, seq)

    const coreFields: EditableField[] = [
      'full_name',
      'emails',
      'mobile',
      'fuse_emp_id',
      'person_nt_login',
      'person_csg_id',
      'person_notes',
    ]

    const employerFields: EditableField[] = [
      'co_ref_id',
      'active',
      'role',
    ]

    const timer = setTimeout(async () => {
      try {
        let updated: PersonRow

        if (coreFields.includes(field)) {
          updated = await updatePersonCore(personId, { [field]: value })
        } else if (employerFields.includes(field)) {
          const payload: any = { [field]: value }

          if (field === 'co_ref_id') {
            const selected = companyOptions.find(
              (o) => String(o.id) === String(value)
            )
            payload.co_code = selected?.code ?? null
          }

          updated = await updatePersonEmployer(personId, payload)
        } else {
          console.warn(`Unhandled field: ${field}`)
          return
        }

        // ignore stale responses (user typed again since scheduling this write)
        if ((writeSeq.current.get(key) ?? 0) !== seq) return

        setRows((prev) =>
          prev.map((r) =>
            r.person_id === updated.person_id ? updated : r
          )
        )
      } catch (err) {
        console.error('Debounced person update error', err)
      } finally {
        writeTimers.current.delete(key)
      }
    }, WRITE_DELAY_MS)

    writeTimers.current.set(key, timer)
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

  function onInspectorClose() {
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
          inlineEdit
            ? 'bg-[var(--to-green-100)]'
            : 'bg-[var(--to-blue-050)]'
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
              {(['all', 'active', 'inactive'] as ActiveFilter[]).map(
                (k) => (
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
                )
              )}
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
                onClick={() => {
                  setInlineEdit((v) => !v)
                  if (!inlineEdit) {
                    setInspectorOpen(false)
                    setSelectedPersonId(null)
                  }
                }}
                className={cx(
                  'rounded px-3 py-1.5 text-sm border',
                  inlineEdit
                    ? 'bg-[var(--to-green-600)] text-white'
                    : 'bg-white'
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
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead className="sticky top-[var(--ledger-header-height)] z-10">
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
                        value={r.full_name ?? ''}
                        onChange={(e) =>
                          updateField(
                            r.person_id,
                            'full_name',
                            e.target.value
                          )
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

                  <td className={td}>{inlineEdit ? (
                    <input className="w-full rounded border px-2 py-1"
                      style={{ borderColor: 'var(--to-border)' }}
                      value={r.emails ?? ''}
                      onChange={(e) =>
                        updateField(r.person_id, 'emails', e.target.value)
                      } />
                  ) : r.emails}</td>

                  <td className={td}>{inlineEdit ? (
                    <input className="w-full rounded border px-2 py-1"
                      style={{ borderColor: 'var(--to-border)' }}
                      value={r.mobile ?? ''}
                      onChange={(e) =>
                        updateField(r.person_id, 'mobile', e.target.value)
                      } />
                  ) : r.mobile}</td>

                  <td className={td}>{inlineEdit ? (
                    <select className="w-full rounded border px-2 py-1"
                      style={{ borderColor: 'var(--to-border)' }}
                      value={r.co_ref_id ?? ''}
                      onChange={(e) =>
                        updateField(r.person_id, 'co_ref_id', e.target.value || null)
                      }>
                      <option value="">— Unassigned —</option>
                      {companyOptions.map(o => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  ) : companyLabel}</td>

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
                          updateField(r.person_id, 'active', r.active === true ? false : true)
                        }
                      >
                        {r.active ? 'Active' : 'Inactive'}
                      </button>
                    ) : (
                      <StatusPill value={r.active} />
                    )}
                  </td>


                  <td className={td}>{inlineEdit ? (
                    <input className="w-full rounded border px-2 py-1"
                      style={{ borderColor: 'var(--to-border)' }}
                      value={r.role ?? ''}
                      onChange={(e) =>
                        updateField(r.person_id, 'role', e.target.value)
                      } />
                  ) : r.role}</td>

                  <td className={td}>{inlineEdit ? (
                    <input className="w-full rounded border px-2 py-1 text-xs"
                      style={{ borderColor: 'var(--to-border)' }}
                      value={r.fuse_emp_id ?? ''}
                      onChange={(e) =>
                        updateField(r.person_id, 'fuse_emp_id', e.target.value)
                      } />
                  ) : r.fuse_emp_id}</td>

                  <td className={td}>{inlineEdit ? (
                    <input className="w-full rounded border px-2 py-1 text-xs"
                      style={{ borderColor: 'var(--to-border)' }}
                      value={r.person_nt_login ?? ''}
                      onChange={(e) =>
                        updateField(r.person_id, 'person_nt_login', e.target.value)
                      } />
                  ) : r.person_nt_login}</td>

                  <td className={td}>{inlineEdit ? (
                    <input className="w-full rounded border px-2 py-1 text-xs"
                      style={{ borderColor: 'var(--to-border)' }}
                      value={r.person_csg_id ?? ''}
                      onChange={(e) =>
                        updateField(r.person_id, 'person_csg_id', e.target.value)
                      } />
                  ) : r.person_csg_id}</td>

                  <td className={td}>{inlineEdit ? (
                    <textarea className="w-full rounded border px-2 py-1 text-xs"
                      rows={2}
                      style={{ borderColor: 'var(--to-border)' }}
                      value={r.person_notes ?? ''}
                      onChange={(e) =>
                        updateField(r.person_id, 'person_notes', e.target.value)
                      } />
                  ) : r.person_notes}</td>
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
