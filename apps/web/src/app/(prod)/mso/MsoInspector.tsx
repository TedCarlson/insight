// apps/web/src/app/(prod)/mso/MsoInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import type { CreateMsoInput, EditableField, MsoInspectorMode, MsoRow } from './mso.types'

function getId(row: MsoRow | null | undefined): string | null {
  const id = row?.mso_id
  return id ? String(id) : null
}

function getName(row: MsoRow | null | undefined): string {
  return String(row?.mso_name ?? '')
}

export default function MsoInspector(props: {
  open: boolean
  mode: MsoInspectorMode
  mso: MsoRow | null
  onChange: (msoId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreateMsoInput) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, mso, onChange, onCreate, onClose } = props
  const isCreate = mode === 'create'

  const [draftName, setDraftName] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const msoId = useMemo(() => getId(mso), [mso])

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setSaving(false)
    setDraftName(isCreate ? '' : getName(mso))
  }, [open, isCreate, mso])

  const title = isCreate ? 'Create MSO' : 'Edit MSO'
  const subtitle = !isCreate && msoId ? `id: ${msoId}` : undefined
  const canCreate = draftName.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('MSO name is required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({ mso_name: draftName.trim() })
      onClose()
    } catch (err: any) {
      console.error('MSO create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleEditChange(next: string) {
    if (!msoId) return
    setDraftName(next)
    onChange(msoId, 'mso_name', next)
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
            MSO Name
          </div>

          <input
            value={draftName}
            onChange={(e) => (isCreate ? setDraftName(e.target.value) : handleEditChange(e.target.value))}
            placeholder="e.g. Comcast"
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--to-border)',
              background: 'var(--to-surface)',
              color: 'var(--to-ink)',
            }}
          />
        </div>
      </div>
    </AdminOverlay>
  )
}
