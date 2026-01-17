// apps/web/src/app/(prod)/company/CompanyInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import type { CompanyInspectorMode, CompanyRow, CreateCompanyInput, EditableField } from './company.types'

function getId(row: CompanyRow | null | undefined): string | null {
  const id = row?.company_id ?? row?.id
  return id ? String(id) : null
}

function getName(row: CompanyRow | null | undefined): string {
  return (
    (row?.company_name ??
      row?.name ??
      '') as string
  )
}

function getCode(row: CompanyRow | null | undefined): string {
  return (
    (row?.company_code ??
      row?.code ??
      '') as string
  )
}

function getActive(row: CompanyRow | null | undefined): boolean {
  const v = row?.is_active ?? row?.active
  return v === null || v === undefined ? true : Boolean(v)
}

export default function CompanyInspector(props: {
  open: boolean
  mode: CompanyInspectorMode
  company: CompanyRow | null
  onChange: (companyId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreateCompanyInput) => Promise<void>
  onDelete: (companyId: string) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, company, onChange, onCreate, onDelete, onClose } = props

  const isCreate = mode === 'create'

  const [draftName, setDraftName] = useState('')
  const [draftCode, setDraftCode] = useState<string>('')
  const [draftActive, setDraftActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Standard: initialize draft ONLY when opening in create mode.
  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setSaving(false)

    if (isCreate) {
      setDraftName('')
      setDraftCode('')
      setDraftActive(true)
    } else {
      // For edit mode we render from the row + push changes outward via onChange.
      // (No local draft required, matching Assignment/Leadership pattern.)
    }
  }, [open, isCreate])

  const companyId = useMemo(() => getId(company), [company])

  const title = isCreate ? 'Create Company' : 'Edit Company'
  const subtitle = !isCreate && companyId ? `id: ${companyId}` : undefined

  const nameValue = isCreate ? draftName : getName(company)
  const codeValue = isCreate ? draftCode : getCode(company)
  const activeValue = isCreate ? draftActive : getActive(company)

  const canSaveCreate = useMemo(() => {
    return draftName.trim().length > 0
  }, [draftName])

  async function handleCreate() {
    setSubmitError(null)

    if (!canSaveCreate) {
      setSubmitError('Name is required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({
        name: draftName.trim(),
        code: draftCode.trim() ? draftCode.trim() : null,
        active: draftActive,
      })
      onClose()
    } catch (err: any) {
      console.error('Company create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!companyId) return
    const ok = window.confirm('Delete this company? This cannot be undone.')
    if (!ok) return

    try {
      setSaving(true)
      setSubmitError(null)
      await onDelete(companyId)
      onClose()
    } catch (err: any) {
      console.error('Company delete error', err)
      setSubmitError(err?.message ?? 'Delete failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminOverlay
      open={open}
      mode={isCreate ? 'create' : 'edit'}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      widthClassName="w-[860px] max-w-[94vw]"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="min-h-[20px] text-sm text-[var(--to-ink-muted)]">
            {submitError ? (
              <span className="text-[var(--to-danger)]">{submitError}</span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {!isCreate && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="rounded border px-3 py-2 text-sm"
                style={{
                  borderColor: 'var(--to-border)',
                  color: 'var(--to-danger)',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                Delete
              </button>
            )}

            <button
              onClick={onClose}
              disabled={saving}
              className="rounded border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--to-border)',
                color: 'var(--to-ink)',
                opacity: saving ? 0.7 : 1,
              }}
            >
              Close
            </button>

            {isCreate && (
              <button
                onClick={handleCreate}
                disabled={saving || !canSaveCreate}
                className="rounded px-3 py-2 text-sm font-semibold"
                style={{
                  background: 'var(--to-cta)',
                  color: 'var(--to-cta-ink)',
                  opacity: saving || !canSaveCreate ? 0.7 : 1,
                }}
              >
                {saving ? 'Creating…' : 'Create'}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="p-4">
        <div className="grid grid-cols-12 gap-3">
          {/* Name */}
          <div className="col-span-12">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              Name
            </label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={nameValue}
              onChange={(e) => {
                const v = e.target.value
                if (isCreate) setDraftName(v)
                else if (companyId) onChange(companyId, 'name', v)
              }}
              placeholder="Company name"
            />
          </div>

          {/* Code */}
          <div className="col-span-12 sm:col-span-6">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              Code
            </label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={codeValue}
              onChange={(e) => {
                const v = e.target.value
                if (isCreate) setDraftCode(v)
                else if (companyId) onChange(companyId, 'code', v)
              }}
              placeholder="Optional"
            />
          </div>

          {/* Active */}
          <div className="col-span-12 sm:col-span-6">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              Active
            </label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={activeValue}
                onChange={(e) => {
                  const v = e.target.checked
                  if (isCreate) setDraftActive(v)
                  else if (companyId) onChange(companyId, 'active', v)
                }}
              />
              <span className="text-sm text-[var(--to-ink)]">
                {activeValue ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {!isCreate && (
          <div className="mt-4 rounded border p-3 text-xs text-[var(--to-ink-muted)]"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
          >
            <div className="font-semibold uppercase tracking-wide mb-1">Edit behavior</div>
            <div>
              Changes write optimistically and are committed with a small debounce (same pattern as Assignment).
            </div>
          </div>
        )}
      </div>
    </AdminOverlay>
  )
}
