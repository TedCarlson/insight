// apps/web/src/app/(prod)/division/DivisionInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import type { CreateDivisionInput, DivisionInspectorMode, DivisionRow, EditableField } from './division.types'

function getId(row: DivisionRow | null | undefined): string | null {
  const id = row?.division_id
  return id ? String(id) : null
}
function getName(row: DivisionRow | null | undefined): string {
  return String(row?.division_name ?? '')
}
function getCode(row: DivisionRow | null | undefined): string {
  return String(row?.division_code ?? '')
}

export default function DivisionInspector(props: {
  open: boolean
  mode: DivisionInspectorMode
  division: DivisionRow | null
  onChange: (divisionId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreateDivisionInput) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, division, onChange, onCreate, onClose } = props
  const isCreate = mode === 'create'

  const [draftName, setDraftName] = useState('')
  const [draftCode, setDraftCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const divisionId = useMemo(() => getId(division), [division])

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setSaving(false)
    setDraftName(isCreate ? '' : getName(division))
    setDraftCode(isCreate ? '' : getCode(division))
  }, [open, isCreate, division])

  const title = isCreate ? 'Create Division' : 'Edit Division'
  const subtitle = !isCreate && divisionId ? `id: ${divisionId}` : undefined
  const canCreate = draftName.trim().length > 0 && draftCode.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('Division name and code are required.')
      return
    }
    try {
      setSaving(true)
      await onCreate({ division_name: draftName.trim(), division_code: draftCode.trim() })
      onClose()
    } catch (err: any) {
      console.error('Division create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleEditName(next: string) {
    if (!divisionId) return
    setDraftName(next)
    onChange(divisionId, 'division_name', next)
  }
  function handleEditCode(next: string) {
    if (!divisionId) return
    setDraftCode(next)
    onChange(divisionId, 'division_code', next)
  }

  const footer = (
    <div className="flex items-center justify-between gap-3 w-full">
      <div className="min-h-[20px] text-sm" style={{ color: 'var(--to-danger)' }}>
        {submitError ?? ''}
      </div>
      {isCreate ? (
        <button
          onClick={handleCreate}
          disabled={saving || !canCreate}
          className="rounded px-3 py-2 text-sm font-semibold"
          style={{
            background: 'var(--to-cta)',
            color: 'var(--to-cta-ink)',
            opacity: saving || !canCreate ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Create'}
        </button>
      ) : (
        <div className="text-sm text-[var(--to-ink-muted)]">Delete disabled.</div>
      )}
    </div>
  )

  return (
    <AdminOverlay open={open} mode={mode as any} title={title} subtitle={subtitle} onClose={onClose} footer={footer}>
      <div className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
            Division Name
          </div>
          <input
            value={draftName}
            onChange={(e) => (isCreate ? setDraftName(e.target.value) : handleEditName(e.target.value))}
            placeholder="e.g. Northeast"
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
          />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
            Division Code
          </div>
          <input
            value={draftCode}
            onChange={(e) => (isCreate ? setDraftCode(e.target.value) : handleEditCode(e.target.value))}
            placeholder="e.g. NE"
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
          />
        </div>
      </div>
    </AdminOverlay>
  )
}
