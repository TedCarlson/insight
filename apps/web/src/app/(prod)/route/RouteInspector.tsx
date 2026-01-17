// apps/web/src/app/(prod)/route/RouteInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import { fetchMsoOptions, type DropdownOption } from '../_shared/dropdowns'
import type { CreateRouteInput, EditableField, RouteInspectorMode, RouteRow } from './route.types'

function getId(row: RouteRow | null | undefined): string | null {
  const id = row?.route_id
  return id ? String(id) : null
}
function getName(row: RouteRow | null | undefined): string {
  return String(row?.route_name ?? '')
}
function getMsoId(row: RouteRow | null | undefined): string {
  return String(row?.mso_id ?? '')
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

  const [draftName, setDraftName] = useState('')
  const [draftMsoId, setDraftMsoId] = useState('')

  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [msoOptions, setMsoOptions] = useState<DropdownOption[]>([])
  const [loadingMsos, setLoadingMsos] = useState(false)

  const routeId = useMemo(() => getId(route), [route])

  useEffect(() => {
    if (!open) return

    setSubmitError(null)
    setSaving(false)

    if (isCreate) {
      setDraftName('')
      setDraftMsoId('')
    } else {
      setDraftName(getName(route))
      setDraftMsoId(getMsoId(route))
    }

    ;(async () => {
      try {
        setLoadingMsos(true)
        const opts = await fetchMsoOptions()
        setMsoOptions(opts)
      } catch (e) {
        console.error('Failed to load MSO options', e)
      } finally {
        setLoadingMsos(false)
      }
    })()
  }, [open, isCreate, route])

  const title = isCreate ? 'Create Route' : 'Edit Route'
  const subtitle = !isCreate && routeId ? `id: ${routeId}` : undefined

  const canCreate = draftName.trim().length > 0 && draftMsoId.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('Route name and MSO are required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({
        route_name: draftName.trim(),
        mso_id: draftMsoId.trim(),
      })
      onClose()
    } catch (err: any) {
      console.error('Route create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleEditName(next: string) {
    if (!routeId) return
    setDraftName(next)
    onChange(routeId, 'route_name', next)
  }

  function handleEditMsoId(next: string) {
    if (!routeId) return
    setDraftMsoId(next)
    onChange(routeId, 'mso_id', next)
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
            Route Name
          </div>
          <input
            value={draftName}
            onChange={(e) => (isCreate ? setDraftName(e.target.value) : handleEditName(e.target.value))}
            placeholder="e.g. Downtown"
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
          />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">
            MSO
          </div>

          <select
            value={draftMsoId}
            onChange={(e) => (isCreate ? setDraftMsoId(e.target.value) : handleEditMsoId(e.target.value))}
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            disabled={loadingMsos}
          >
            <option value="">{loadingMsos ? 'Loading…' : 'Select MSO'}</option>
            {msoOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </AdminOverlay>
  )
}
