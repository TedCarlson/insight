// apps/web/src/app/(prod)/region/RegionInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import type { CreateRegionInput, EditableField, RegionInspectorMode, RegionRow } from './region.types'

function getId(row: RegionRow | null | undefined): string | null {
  const id = row?.region_id
  return id ? String(id) : null
}
function getName(row: RegionRow | null | undefined): string {
  return String(row?.region_name ?? '')
}
function getCode(row: RegionRow | null | undefined): string {
  return String(row?.region_code ?? '')
}

export default function RegionInspector(props: {
  open: boolean
  mode: RegionInspectorMode
  region: RegionRow | null
  onChange: (regionId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreateRegionInput) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, region, onChange, onCreate, onClose } = props
  const isCreate = mode === 'create'

  const [draftName, setDraftName] = useState('')
  const [draftCode, setDraftCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const regionId = useMemo(() => getId(region), [region])

  useEffect(() => {
    if (!open) return
    setSubmitError(null)
    setSaving(false)
    setDraftName(isCreate ? '' : getName(region))
    setDraftCode(isCreate ? '' : getCode(region))
  }, [open, isCreate, region])

  const title = isCreate ? 'Create Region' : 'Edit Region'
  const subtitle = !isCreate && regionId ? `id: ${regionId}` : undefined
  const canCreate = draftName.trim().length > 0 && draftCode.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('Region name and code are required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({ region_name: draftName.trim(), region_code: draftCode.trim() })
      onClose()
    } catch (err: any) {
      console.error('Region create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleEditName(next: string) {
    if (!regionId) return
    setDraftName(next)
    onChange(regionId, 'region_name', next)
  }

  function handleEditCode(next: string) {
    if (!regionId) return
    setDraftCode(next)
    onChange(regionId, 'region_code', next)
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
            Region Name
          </div>
          <input
            value={draftName}
            onChange={(e) => (isCreate ? setDraftName(e.target.value) : handleEditName(e.target.value))}
            placeholder="e.g. Mid-Atlantic"
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
          />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
            Region Code
          </div>
          <input
            value={draftCode}
            onChange={(e) => (isCreate ? setDraftCode(e.target.value) : handleEditCode(e.target.value))}
            placeholder="e.g. MA"
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
          />
        </div>
      </div>
    </AdminOverlay>
  )
}
