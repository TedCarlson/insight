// apps/web/src/app/(prod)/contractor/ContractorInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import type {
  ContractorInspectorMode,
  ContractorRow,
  CreateContractorInput,
  EditableField,
} from './contractor.types'

function getId(row: ContractorRow | null | undefined): string | null {
  const id = row?.contractor_id ?? row?.id
  return id ? String(id) : null
}

function getName(row: ContractorRow | null | undefined): string {
  return String(row?.contractor_name ?? row?.name ?? '')
}

function getCode(row: ContractorRow | null | undefined): string {
  return String(row?.contractor_code ?? row?.code ?? '')
}

function getActive(row: ContractorRow | null | undefined): boolean {
  const v = row?.is_active ?? row?.active
  return v === null || v === undefined ? true : Boolean(v)
}

export default function ContractorInspector(props: {
  open: boolean
  mode: ContractorInspectorMode
  contractor: ContractorRow | null
  onChange: (contractorId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreateContractorInput) => Promise<void>
  onDelete: (contractorId: string) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, contractor, onChange, onCreate, onDelete, onClose } = props

  const isCreate = mode === 'create'

  const [draftName, setDraftName] = useState('')
  const [draftCode, setDraftCode] = useState<string>('')
  const [draftActive, setDraftActive] = useState(true)

  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setSaving(false)

    if (isCreate) {
      setDraftName('')
      setDraftCode('')
      setDraftActive(true)
    }
  }, [open, isCreate])

  const contractorId = useMemo(() => getId(contractor), [contractor])
  const title = isCreate ? 'Create Contractor' : 'Edit Contractor'
  const subtitle = !isCreate && contractorId ? `id: ${contractorId}` : undefined

  const nameValue = isCreate ? draftName : getName(contractor)
  const codeValue = isCreate ? draftCode : getCode(contractor)
  const activeValue = isCreate ? draftActive : getActive(contractor)

  const canSaveCreate = useMemo(() => draftName.trim().length > 0, [draftName])

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
      console.error('Contractor create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!contractorId) return
    const ok = window.confirm('Delete this contractor? This cannot be undone.')
    if (!ok) return

    try {
      setSaving(true)
      setSubmitError(null)
      await onDelete(contractorId)
      onClose()
    } catch (err: any) {
      console.error('Contractor delete error', err)
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
            {submitError ? <span className="text-[var(--to-danger)]">{submitError}</span> : null}
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
                else if (contractorId) onChange(contractorId, 'name', v)
              }}
              placeholder="Contractor name"
            />
          </div>

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
                else if (contractorId) onChange(contractorId, 'code', v)
              }}
              placeholder="Optional"
            />
          </div>

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
                  else if (contractorId) onChange(contractorId, 'active', v)
                }}
              />
              <span className="text-sm text-[var(--to-ink)]">
                {activeValue ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>

        {!isCreate && (
          <div
            className="mt-4 rounded border p-3 text-xs text-[var(--to-ink-muted)]"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
          >
            <div className="font-semibold uppercase tracking-wide mb-1">Edit behavior</div>
            <div>Changes write optimistically and are committed with a small debounce.</div>
          </div>
        )}
      </div>
    </AdminOverlay>
  )
}
