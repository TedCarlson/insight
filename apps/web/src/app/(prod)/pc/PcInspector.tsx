// apps/web/src/app/(prod)/pc/PcInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import type { CreatePcInput, EditableField, PcInspectorMode, PcRow } from './pc.types'

function getId(row: PcRow | null | undefined): string | null {
  const id = row?.pc_id ?? row?.id
  return id ? String(id) : null
}

function getName(row: PcRow | null | undefined): string {
  return String(row?.pc_name ?? row?.name ?? '')
}

function getCode(row: PcRow | null | undefined): string {
  return String(row?.pc_code ?? row?.code ?? '')
}

function getPcNumber(row: PcRow | null | undefined): string {
  const v = row?.pc_number ?? row?.number ?? row?.pc_no
  return v === null || v === undefined ? '' : String(v)
}

function getActive(row: PcRow | null | undefined): boolean {
  const v = row?.is_active ?? row?.active
  return v === null || v === undefined ? true : Boolean(v)
}

export default function PcInspector(props: {
  open: boolean
  mode: PcInspectorMode
  pc: PcRow | null
  onChange: (pcId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreatePcInput) => Promise<void>
  onDelete: (pcId: string) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, pc, onChange, onCreate, onDelete, onClose } = props
  const isCreate = mode === 'create'

  const [draftName, setDraftName] = useState('')
  const [draftCode, setDraftCode] = useState('')
  const [draftPcNumber, setDraftPcNumber] = useState('')
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
      setDraftPcNumber('')
      setDraftActive(true)
    }
  }, [open, isCreate])

  const pcId = useMemo(() => getId(pc), [pc])

  const title = isCreate ? 'Create PC' : 'Edit PC'
  const subtitle = !isCreate && pcId ? `id: ${pcId}` : undefined

  const nameValue = isCreate ? draftName : getName(pc)
  const codeValue = isCreate ? draftCode : getCode(pc)
  const pcNumberValue = isCreate ? draftPcNumber : getPcNumber(pc)
  const activeValue = isCreate ? draftActive : getActive(pc)

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
        pc_number: draftPcNumber.trim() ? draftPcNumber.trim() : null,
        active: draftActive,
      })
      onClose()
    } catch (err: any) {
      console.error('PC create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!pcId) return
    const ok = window.confirm('Delete this PC? This cannot be undone.')
    if (!ok) return

    try {
      setSaving(true)
      setSubmitError(null)
      await onDelete(pcId)
      onClose()
    } catch (err: any) {
      console.error('PC delete error', err)
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
      widthClassName="w-[900px] max-w-[94vw]"
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
                style={{ borderColor: 'var(--to-border)', color: 'var(--to-danger)', opacity: saving ? 0.7 : 1 }}
              >
                Delete
              </button>
            )}

            <button
              onClick={onClose}
              disabled={saving}
              className="rounded border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--to-border)', color: 'var(--to-ink)', opacity: saving ? 0.7 : 1 }}
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
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Name</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={nameValue}
              onChange={(e) => {
                const v = e.target.value
                if (isCreate) setDraftName(v)
                else if (pcId) onChange(pcId, 'name', v)
              }}
              placeholder="PC name"
            />
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Code</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={codeValue}
              onChange={(e) => {
                const v = e.target.value
                if (isCreate) setDraftCode(v)
                else if (pcId) onChange(pcId, 'code', v)
              }}
              placeholder="Optional"
            />
          </div>

          <div className="col-span-12 sm:col-span-6">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
              PC Number
            </label>
            <input
              className="mt-1 w-full rounded border px-3 py-2 text-sm bg-white"
              style={{ borderColor: 'var(--to-border)' }}
              value={pcNumberValue}
              onChange={(e) => {
                const v = e.target.value
                if (isCreate) setDraftPcNumber(v)
                else if (pcId) onChange(pcId, 'pc_number', v)
              }}
              placeholder="Optional"
            />
          </div>

          <div className="col-span-12">
            <label className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Active</label>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={activeValue}
                onChange={(e) => {
                  const v = e.target.checked
                  if (isCreate) setDraftActive(v)
                  else if (pcId) onChange(pcId, 'active', v)
                }}
              />
              <span className="text-sm text-[var(--to-ink)]">{activeValue ? 'Active' : 'Inactive'}</span>
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
