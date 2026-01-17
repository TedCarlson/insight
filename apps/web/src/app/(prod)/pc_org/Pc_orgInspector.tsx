// apps/web/src/app/(prod)/pc_org/Pc_orgInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import {
  fetchDivisionOptions,
  fetchMsoOptions,
  fetchPcOptions,
  fetchRegionOptions,
  type DropdownOption,
} from '../_shared/dropdowns'
import type { CreatePcOrgInput, EditableField, PcOrgInspectorMode, PcOrgRow } from './pc_org.types'

function getId(row: PcOrgRow | null | undefined): string | null {
  const id = row?.pc_org_id
  return id ? String(id) : null
}

export default function Pc_orgInspector(props: {
  open: boolean
  mode: PcOrgInspectorMode
  pcOrg: PcOrgRow | null
  onChange: (pcOrgId: string, field: EditableField, value: any) => void
  onCreate: (payload: CreatePcOrgInput) => Promise<void>
  onClose: () => void
}) {
  const { open, mode, pcOrg, onChange, onCreate, onClose } = props
  const isCreate = mode === 'create'

  const [draftName, setDraftName] = useState('')
  const [draftPcId, setDraftPcId] = useState('')
  const [draftDivisionId, setDraftDivisionId] = useState('')
  const [draftRegionId, setDraftRegionId] = useState('')
  const [draftMsoId, setDraftMsoId] = useState('')

  const [pcOptions, setPcOptions] = useState<DropdownOption[]>([])
  const [divisionOptions, setDivisionOptions] = useState<DropdownOption[]>([])
  const [regionOptions, setRegionOptions] = useState<DropdownOption[]>([])
  const [msoOptions, setMsoOptions] = useState<DropdownOption[]>([])
  const [loadingOpts, setLoadingOpts] = useState(false)

  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const pcOrgId = useMemo(() => getId(pcOrg), [pcOrg])

  useEffect(() => {
    if (!open) return

    setSubmitError(null)
    setSaving(false)

    if (isCreate) {
      setDraftName('')
      setDraftPcId('')
      setDraftDivisionId('')
      setDraftRegionId('')
      setDraftMsoId('')
    } else {
      setDraftName(String(pcOrg?.pc_org_name ?? ''))
      setDraftPcId(String(pcOrg?.pc_id ?? ''))
      setDraftDivisionId(String(pcOrg?.division_id ?? ''))
      setDraftRegionId(String(pcOrg?.region_id ?? ''))
      setDraftMsoId(String(pcOrg?.mso_id ?? ''))
    }

    ;(async () => {
      try {
        setLoadingOpts(true)
        const [pcs, divs, regs, msos] = await Promise.all([
          fetchPcOptions(),
          fetchDivisionOptions(),
          fetchRegionOptions(),
          fetchMsoOptions(),
        ])
        setPcOptions(pcs)
        setDivisionOptions(divs)
        setRegionOptions(regs)
        setMsoOptions(msos)
      } catch (e) {
        console.error('Failed to load PC Org dropdown options', e)
      } finally {
        setLoadingOpts(false)
      }
    })()
  }, [open, isCreate, pcOrg])

  const title = isCreate ? 'Create PC Org' : 'Edit PC Org'
  const subtitle = !isCreate && pcOrgId ? `id: ${pcOrgId}` : undefined

  const canCreate =
    draftName.trim().length > 0 &&
    draftPcId.trim().length > 0 &&
    draftDivisionId.trim().length > 0 &&
    draftRegionId.trim().length > 0 &&
    draftMsoId.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('PC Org name, PC, Division, Region, and MSO are required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({
        pc_org_name: draftName.trim(),
        pc_id: draftPcId.trim(),
        division_id: draftDivisionId.trim(),
        region_id: draftRegionId.trim(),
        mso_id: draftMsoId.trim(),
      })
      onClose()
    } catch (err: any) {
      console.error('PC Org create error', err)
      setSubmitError(err?.message ?? 'Create failed.')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(field: EditableField, next: string) {
    if (!pcOrgId) return
    onChange(pcOrgId, field, next)
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
            PC Org Name
          </div>
          <input
            value={draftName}
            onChange={(e) => {
              const v = e.target.value
              setDraftName(v)
              if (!isCreate) handleEdit('pc_org_name', v)
            }}
            placeholder="e.g. East Ops"
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
          />
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">PC</div>
          <select
            value={draftPcId}
            onChange={(e) => {
              const v = e.target.value
              setDraftPcId(v)
              if (!isCreate) handleEdit('pc_id', v)
            }}
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            disabled={loadingOpts}
          >
            <option value="">{loadingOpts ? 'Loading…' : 'Select PC'}</option>
            {pcOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Division</div>
          <select
            value={draftDivisionId}
            onChange={(e) => {
              const v = e.target.value
              setDraftDivisionId(v)
              if (!isCreate) handleEdit('division_id', v)
            }}
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            disabled={loadingOpts}
          >
            <option value="">{loadingOpts ? 'Loading…' : 'Select Division'}</option>
            {divisionOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code ? `${o.label} (${o.code})` : o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">Region</div>
          <select
            value={draftRegionId}
            onChange={(e) => {
              const v = e.target.value
              setDraftRegionId(v)
              if (!isCreate) handleEdit('region_id', v)
            }}
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            disabled={loadingOpts}
          >
            <option value="">{loadingOpts ? 'Loading…' : 'Select Region'}</option>
            {regionOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code ? `${o.label} (${o.code})` : o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--to-ink-muted)]">MSO</div>
          <select
            value={draftMsoId}
            onChange={(e) => {
              const v = e.target.value
              setDraftMsoId(v)
              if (!isCreate) handleEdit('mso_id', v)
            }}
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            disabled={loadingOpts}
          >
            <option value="">{loadingOpts ? 'Loading…' : 'Select MSO'}</option>
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
