// apps/web/src/app/(prod)/pc/PcInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import type { CreatePcInput, EditableField, PcInspectorMode, PcRow } from './pc.types'

function getId(row: PcRow | null | undefined): string | null {
  const id = row?.pc_id
  return id ? String(id) : null
}

function getNumber(row: PcRow | null | undefined): string {
  return String(row?.pc_number ?? '')
}

export default function PcInspector(props: {
  open: boolean
  mode: PcInspectorMode
  pc: PcRow | null
  onChange: (pcId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreatePcInput) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, pc, onChange, onCreate, onClose } = props
  const isCreate = mode === 'create'

  const [draftNumber, setDraftNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const pcId = useMemo(() => getId(pc), [pc])

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setSaving(false)
    setDraftNumber(isCreate ? '' : getNumber(pc))
  }, [open, isCreate, pc])

  const title = isCreate ? 'Create PC' : 'Edit PC'
  const subtitle = !isCreate && pcId ? `id: ${pcId}` : undefined
  const canCreate = draftNumber.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('PC number is required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({ pc_number: draftNumber.trim() })
      onClose()
    } catch (err: any) {
      console.error('PC create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleEditChange(next: string) {
    if (!pcId) return
    setDraftNumber(next)
    onChange(pcId, 'pc_number', next)
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
            PC Number
          </div>

          <input
            value={draftNumber}
            onChange={(e) => (isCreate ? setDraftNumber(e.target.value) : handleEditChange(e.target.value))}
            placeholder="e.g. 1001"
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
