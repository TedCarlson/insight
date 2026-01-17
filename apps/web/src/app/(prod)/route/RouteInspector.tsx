// apps/web/src/app/(prod)/route/RouteInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import {
  fetchPcOrgOptions,
  fetchDefaultPcOrgIdForCurrentUser,
  type DropdownOption,
} from '../_shared/dropdowns'
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

  const [draftPcOrgId, setDraftPcOrgId] = useState<string>('')
  const [draftName, setDraftName] = useState('')

  useEffect(() => {
    if (!open) return

    setSubmitError(null)
    setSaving(false)

    if (isCreate) {
      setDraftPcOrgId('')
      setDraftName('')
    } else {
      setDraftPcOrgId(String(route?.pc_org_id ?? ''))
      setDraftName(String(route?.route_name ?? ''))
    }
  }, [open, isCreate, route])

  useEffect(() => {
    if (!open) return

    let alive = true
    ;(async () => {
      try {
        setLoadingPcOrg(true)
        const opts = await fetchPcOrgOptions()
        if (!alive) return
        setPcOrgOptions(opts)

        // Create flow only: default pc org from assignment_admin_v
        if (isCreate) {
          const defaultPcOrgId = await fetchDefaultPcOrgIdForCurrentUser()
          if (!alive) return
          if (defaultPcOrgId && !draftPcOrgId.trim()) {
            const exists = opts.some((o) => o.id === defaultPcOrgId)
            if (exists) setDraftPcOrgId(defaultPcOrgId)
          }
        }
      } catch (e) {
        console.error('Failed to load PC Org options for Route', e)
      } finally {
        if (alive) setLoadingPcOrg(false)
      }
    })()

    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleEdit(field: EditableField, value: any) {
    if (!routeId) return
    onChange(routeId, field, value)
  }

  const pcOrgRequired = true
  const lockNameUntilPcOrg = true
  const nameDisabled = isCreate && lockNameUntilPcOrg && !draftPcOrgId.trim()

  const canCreate = draftName.trim().length > 0 && (!pcOrgRequired || draftPcOrgId.trim().length > 0)

  async function handleCreate() {
    setSubmitError(null)

    if (pcOrgRequired && !draftPcOrgId.trim()) {
      setSubmitError('PC Org is required.')
      return
    }
    if (!draftName.trim()) {
      setSubmitError('Route name is required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({
        route_name: draftName.trim(),
        pc_org_id: draftPcOrgId.trim(),
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
        {/* PC Org selector FIRST */}
        <div>
          <div className="text-sm font-medium">
            PC Org <span className="text-[var(--to-danger)]">*</span>
          </div>
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
            <option value="">{loadingPcOrg ? 'Loading…' : 'Select PC Org'}</option>
            {pcOrgOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
            Defaults to your assigned PC Org when available.
          </div>
        </div>

        {/* Route Name second */}
        <div>
          <div className="text-sm font-medium">
            Route Name <span className="text-[var(--to-danger)]">*</span>
          </div>
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
              opacity: nameDisabled ? 0.6 : 1,
            }}
            disabled={nameDisabled}
          />

          {nameDisabled ? (
            <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
              Select PC Org first to enable Route Name.
            </div>
          ) : null}
        </div>
      </div>
    </AdminOverlay>
  )
}
