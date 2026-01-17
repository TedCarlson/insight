// apps/web/src/app/(prod)/quota/QuotaInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import { fetchRouteOptions, type DropdownOption } from '../_shared/dropdowns'
import type { CreateQuotaInput, EditableField, QuotaInspectorMode, QuotaRow } from './quota.types'

function getId(row: QuotaRow | null | undefined): string | null {
  const id = row?.quota_id
  return id ? String(id) : null
}

function numOrNull(v: string): number | null {
  const t = v.trim()
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export default function QuotaInspector(props: {
  open: boolean
  mode: QuotaInspectorMode
  quota: QuotaRow | null
  onChange: (quotaId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreateQuotaInput) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, quota, onChange, onCreate, onClose } = props
  const isCreate = mode === 'create'

  const [draftRouteId, setDraftRouteId] = useState('')
  const [draftUnits, setDraftUnits] = useState('') // keep as text for easy editing
  const [draftHours, setDraftHours] = useState('')

  const [routeOptions, setRouteOptions] = useState<DropdownOption[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)

  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const quotaId = useMemo(() => getId(quota), [quota])

  useEffect(() => {
    if (!open) return

    setSubmitError(null)
    setSaving(false)

    if (isCreate) {
      setDraftRouteId('')
      setDraftUnits('')
      setDraftHours('')
    } else {
      setDraftRouteId(String(quota?.route_id ?? ''))
      setDraftUnits(quota?.q_units === null || quota?.q_units === undefined ? '' : String(quota.q_units))
      setDraftHours(quota?.q_hours === null || quota?.q_hours === undefined ? '' : String(quota.q_hours))
    }

    ;(async () => {
      try {
        setLoadingRoutes(true)
        const opts = await fetchRouteOptions()
        setRouteOptions(opts)
      } catch (e) {
        console.error('Failed to load Route options for Quota', e)
      } finally {
        setLoadingRoutes(false)
      }
    })()
  }, [open, isCreate, quota])

  const title = isCreate ? 'Create Quota' : 'Edit Quota'
  const subtitle = !isCreate && quotaId ? `id: ${quotaId}` : undefined

  const canCreate = draftRouteId.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('Route is required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({
        route_id: draftRouteId.trim(),
        q_units: numOrNull(draftUnits),
        q_hours: numOrNull(draftHours),
      })
      onClose()
    } catch (err: any) {
      console.error('Quota create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(field: EditableField, value: any) {
    if (!quotaId) return
    onChange(quotaId, field, value)
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
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Route</div>
          <select
            value={draftRouteId}
            onChange={(e) => {
              const v = e.target.value
              setDraftRouteId(v)
              if (!isCreate) handleEdit('route_id', v)
            }}
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            disabled={loadingRoutes}
          >
            <option value="">{loadingRoutes ? 'Loading…' : 'Select Route'}</option>
            {routeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Units</div>
            <input
              value={draftUnits}
              onChange={(e) => {
                const v = e.target.value
                setDraftUnits(v)
                if (!isCreate) handleEdit('q_units', numOrNull(v))
              }}
              placeholder="e.g. 120"
              className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
              inputMode="decimal"
            />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Hours</div>
            <input
              value={draftHours}
              onChange={(e) => {
                const v = e.target.value
                setDraftHours(v)
                if (!isCreate) handleEdit('q_hours', numOrNull(v))
              }}
              placeholder="e.g. 40"
              className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
              inputMode="decimal"
            />
          </div>
        </div>
      </div>
    </AdminOverlay>
  )
}
