// apps/web/src/app/(prod)/route/RouteInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import { fetchPcOrgOptions, type DropdownOption } from '../_shared/dropdowns'
import type { CreateRouteInput, EditableField, RouteInspectorMode, RouteRow } from './route.types'

function getId(row: RouteRow | null | undefined): string | null {
  const id = row?.route_id
  return id ? String(id) : null
}

export default function RouteInspector(props: {
  open: boolean
  mode: RouteInspectorMode
  route: RouteRow | null
  onChange: (routeId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreateRouteInput) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, route, onChange, onCreate, onClose } = props

  const isCreate = mode === 'create'
  const routeId = useMemo(() => getId(route), [route])

  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [pcOrgOptions, setPcOrgOptions] = useState<DropdownOption[]>([])
  const [loadingPcOrg, setLoadingPcOrg] = useState(false)

  const [draftName, setDraftName] = useState('')
  const [draftPcOrgId, setDraftPcOrgId] = useState<string>('')

  useEffect(() => {
    if (!open) return

    setSubmitError(null)
    setSaving(false)

    if (isCreate) {
      setDraftName('')
      setDraftPcOrgId('')
    } else {
      setDraftName(String(route?.route_name ?? ''))
      setDraftPcOrgId(String(route?.pc_org_id ?? ''))
    }
  }, [open, isCreate, route])

  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        setLoadingPcOrg(true)
        const opts = await fetchPcOrgOptions()
        setPcOrgOptions(opts)
      } catch (e) {
        console.error('Failed to load PC Org options for Route', e)
      } finally {
        setLoadingPcOrg(false)
      }
    })()
  }, [open])

  function handleEdit(field: EditableField, value: any) {
    if (!routeId) return
    onChange(routeId, field, value)
  }

  const canCreate = draftName.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('Route name is required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({
        route_name: draftName.trim(),
        pc_org_id: draftPcOrgId.trim() ? draftPcOrgId.trim() : null,
      })
      onClose()
    } catch (err: any) {
      console.error('Route create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="min-h-[20px] text-sm" style={{ color: 'var(--to-danger)' }}>
        {submitError ?? ''}
      </div>

      {isCreate ? (
        <button
          onClick={handleCreate}
          disabled={saving || !canCreate}
          className="rounded px-3 py-2 text-sm font-medium"
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

  const legacyMsoText =
    !isCreate && (route?.mso_name || route?.mso_id)
      ? `${route?.mso_name ?? ''}${route?.mso_name && route?.mso_id ? ' · ' : ''}${route?.mso_id ?? ''}`
      : null

  return (
    <AdminOverlay
      open={open}
      mode={mode as any}
      title={isCreate ? 'Create Route' : 'Edit Route'}
      subtitle={!isCreate && routeId ? `id: ${routeId}` : undefined}
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-6">
        {/* Route Name */}
        <div>
          <div className="text-sm font-medium">Route Name</div>
          <input
            value={draftName}
            onChange={(e) => {
              const v = e.target.value
              setDraftName(v)
              if (!isCreate) handleEdit('route_name', v)
            }}
            placeholder="e.g., Route 12"
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--to-border)',
              background: 'var(--to-surface)',
              color: 'var(--to-ink)',
            }}
          />
        </div>

        {/* PC Org selector (new anchor) */}
        <div>
          <div className="text-sm font-medium">PC Org</div>
          <select
            value={draftPcOrgId}
            onChange={(e) => {
              const v = e.target.value
              setDraftPcOrgId(v)
              if (!isCreate) handleEdit('pc_org_id', v || null)
            }}
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{
              borderColor: 'var(--to-border)',
              background: 'var(--to-surface)',
              color: 'var(--to-ink)',
            }}
            disabled={loadingPcOrg}
          >
            <option value="">{loadingPcOrg ? 'Loading…' : 'Select PC Org (recommended)'}</option>
            {pcOrgOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
            PC Org will become required once existing routes are backfilled.
          </div>
        </div>

        {/* Legacy MSO (read-only, transition context) */}
        {legacyMsoText ? (
          <div className="rounded border px-3 py-2" style={{ borderColor: 'var(--to-border)' }}>
            <div className="text-xs font-medium text-[var(--to-ink-muted)]">Legacy MSO (transition)</div>
            <div className="mt-1 text-sm text-[var(--to-ink)]">{legacyMsoText}</div>
          </div>
        ) : null}
      </div>
    </AdminOverlay>
  )
}
