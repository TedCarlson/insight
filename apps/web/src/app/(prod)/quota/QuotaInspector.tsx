// apps/web/src/app/(prod)/quota/QuotaInspector.tsx

'use client'

import { useEffect, useMemo, useState } from 'react'
import AdminOverlay from '../_shared/AdminOverlay'
import {
  fetchFiscalMonthOptions,
  fetchRouteOptions,
  type DropdownOption,
} from '../_shared/dropdowns'
import type { CreateQuotaInput, EditableField, QuotaInspectorMode, QuotaRow } from './quota.types'

function getId(row: QuotaRow | null | undefined): string | null {
  const id = row?.quota_id
  return id ? String(id) : null
}

function toIntNonNeg(v: string): number {
  const t = (v ?? '').trim()
  if (!t) return 0
  const n = Number.parseInt(t, 10)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, n)
}

function currentFiscalMonthKey(): string {
  // Convention: name by END MONTH (month containing the 21st)
  // If today >= 22 => fiscal month start = 22nd this month => end month = next month
  // Else           => fiscal month start = 22nd prev month => end month = this month
  const dt = new Date()
  const y = dt.getFullYear()
  const m0 = dt.getMonth() // 0-based
  const d = dt.getDate()

  let endYear = y
  let endMonth0 = m0

  if (d >= 22) {
    endMonth0 = m0 + 1
    if (endMonth0 > 11) {
      endMonth0 = 0
      endYear = y + 1
    }
  } else {
    endMonth0 = m0
    endYear = y
  }

  const mm = String(endMonth0 + 1).padStart(2, '0')
  return `${endYear}-${mm}`
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
  const quotaId = useMemo(() => getId(quota), [quota])

  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [routeOptions, setRouteOptions] = useState<DropdownOption[]>([])
  const [loadingRoutes, setLoadingRoutes] = useState(false)

  const [fiscalMonthOptions, setFiscalMonthOptions] = useState<DropdownOption[]>([])
  const [loadingFiscalMonths, setLoadingFiscalMonths] = useState(false)

  // Draft values
  const [draftRouteId, setDraftRouteId] = useState('')
  const [draftFiscalMonthId, setDraftFiscalMonthId] = useState('')

  const [qhSun, setQhSun] = useState('0')
  const [qhMon, setQhMon] = useState('0')
  const [qhTue, setQhTue] = useState('0')
  const [qhWed, setQhWed] = useState('0')
  const [qhThu, setQhThu] = useState('0')
  const [qhFri, setQhFri] = useState('0')
  const [qhSat, setQhSat] = useState('0')

  // Initialize drafts when opening
  useEffect(() => {
    if (!open) return

    setSubmitError(null)
    setSaving(false)

    if (isCreate) {
      setDraftRouteId('')
      setDraftFiscalMonthId('')

      setQhSun('0')
      setQhMon('0')
      setQhTue('0')
      setQhWed('0')
      setQhThu('0')
      setQhFri('0')
      setQhSat('0')
    } else {
      setDraftRouteId(String(quota?.route_id ?? ''))
      setDraftFiscalMonthId(String(quota?.fiscal_month_id ?? ''))

      setQhSun(String(quota?.qh_sun ?? 0))
      setQhMon(String(quota?.qh_mon ?? 0))
      setQhTue(String(quota?.qh_tue ?? 0))
      setQhWed(String(quota?.qh_wed ?? 0))
      setQhThu(String(quota?.qh_thu ?? 0))
      setQhFri(String(quota?.qh_fri ?? 0))
      setQhSat(String(quota?.qh_sat ?? 0))
    }
  }, [open, isCreate, quota])

  // Load dropdown options (routes + fiscal months)
  useEffect(() => {
    if (!open) return

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

    ;(async () => {
      try {
        setLoadingFiscalMonths(true)
        const opts = await fetchFiscalMonthOptions()
        setFiscalMonthOptions(opts)

        // Default selection (create mode only): choose current fiscal month by month_key if possible
        if (isCreate) {
          const key = currentFiscalMonthKey()
          const match = opts.find((o) => (o.code ?? '') === key)
          if (match) setDraftFiscalMonthId(match.id)
          else if (opts[0]) setDraftFiscalMonthId(opts[0].id)
        }
      } catch (e) {
        console.error('Failed to load Fiscal Month options for Quota', e)
      } finally {
        setLoadingFiscalMonths(false)
      }
    })()
  }, [open, isCreate])

  function handleEdit(field: EditableField, value: any) {
    if (!quotaId) return
    onChange(quotaId, field, value)
  }

  // Live totals (create mode preview) OR fallback to view totals (edit mode)
  const draftTotalHours =
    toIntNonNeg(qhSun) +
    toIntNonNeg(qhMon) +
    toIntNonNeg(qhTue) +
    toIntNonNeg(qhWed) +
    toIntNonNeg(qhThu) +
    toIntNonNeg(qhFri) +
    toIntNonNeg(qhSat)

  const previewHours = isCreate ? draftTotalHours : Number(quota?.qt_hours ?? draftTotalHours)
  const previewUnits = isCreate ? draftTotalHours * 12 : Number(quota?.qt_units ?? draftTotalHours * 12)

  const title = isCreate ? 'Create Quota' : 'Edit Quota'
  const subtitle =
    !isCreate && quotaId
      ? `id: ${quotaId}`
      : isCreate && draftFiscalMonthId
        ? (() => {
            const fm = fiscalMonthOptions.find((o) => o.id === draftFiscalMonthId)
            return fm ? `Fiscal Month: ${fm.label}` : undefined
          })()
        : undefined

  const canCreate = draftRouteId.trim().length > 0 && draftFiscalMonthId.trim().length > 0

  async function handleCreate() {
    setSubmitError(null)
    if (!canCreate) {
      setSubmitError('Route and Fiscal Month are required.')
      return
    }

    try {
      setSaving(true)
      await onCreate({
        route_id: draftRouteId.trim(),
        fiscal_month_id: draftFiscalMonthId.trim(),

        qh_sun: toIntNonNeg(qhSun),
        qh_mon: toIntNonNeg(qhMon),
        qh_tue: toIntNonNeg(qhTue),
        qh_wed: toIntNonNeg(qhWed),
        qh_thu: toIntNonNeg(qhThu),
        qh_fri: toIntNonNeg(qhFri),
        qh_sat: toIntNonNeg(qhSat),
      })
      onClose()
    } catch (err: any) {
      console.error('Quota create error', err)
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

  const dayFields: Array<{
    key: EditableField
    label: string
    value: string
    setValue: (v: string) => void
  }> = [
    { key: 'qh_sun', label: 'Sun', value: qhSun, setValue: setQhSun },
    { key: 'qh_mon', label: 'Mon', value: qhMon, setValue: setQhMon },
    { key: 'qh_tue', label: 'Tue', value: qhTue, setValue: setQhTue },
    { key: 'qh_wed', label: 'Wed', value: qhWed, setValue: setQhWed },
    { key: 'qh_thu', label: 'Thu', value: qhThu, setValue: setQhThu },
    { key: 'qh_fri', label: 'Fri', value: qhFri, setValue: setQhFri },
    { key: 'qh_sat', label: 'Sat', value: qhSat, setValue: setQhSat },
  ]

  return (
    <AdminOverlay
      open={open}
      mode={mode as any}
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={footer}
    >
      <div className="space-y-6">
        {/* Route */}
        <div>
          <div className="text-sm font-medium">Route</div>
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

        {/* Fiscal Month */}
        <div>
          <div className="text-sm font-medium">Fiscal Month</div>
          <select
            value={draftFiscalMonthId}
            onChange={(e) => {
              const v = e.target.value
              setDraftFiscalMonthId(v)
              if (!isCreate) handleEdit('fiscal_month_id', v)
            }}
            className="mt-2 w-full rounded border px-3 py-2 text-sm outline-none"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)', color: 'var(--to-ink)' }}
            disabled={loadingFiscalMonths}
          >
            <option value="">{loadingFiscalMonths ? 'Loading…' : 'Select Fiscal Month'}</option>
            {fiscalMonthOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>

          <div className="mt-2 text-xs text-[var(--to-ink-muted)]">
            Rolling 24 months. Naming uses the month containing the 21st (end month).
          </div>
        </div>

        {/* Day Hours Grid (single-row compact layout) */}
        <div>
          <div className="flex items-baseline justify-between">
            <div className="text-sm font-medium">Weekly Hours (by day)</div>
            <div className="text-xs text-[var(--to-ink-muted)]">Units = Hours × 12</div>
          </div>

          {/* One-row grid on desktop; wraps only on very small screens */}
          <div className="mt-3 w-full">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {dayFields.map((f) => (
                <div
                  key={f.key}
                  className="rounded border p-2"
                  style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
                >
                  <div className="text-[11px] font-medium text-[var(--to-ink-muted)]">{f.label}</div>
                  <input
                    value={f.value}
                    onChange={(e) => {
                      const v = e.target.value
                      f.setValue(v)
                      if (!isCreate) handleEdit(f.key, toIntNonNeg(v))
                    }}
                    className="mt-1 w-full rounded border px-2 py-1.5 text-sm outline-none"
                    style={{
                      borderColor: 'var(--to-border)',
                      background: 'var(--to-surface)',
                      color: 'var(--to-ink)',
                    }}
                    inputMode="numeric"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div
            className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border px-4 py-3"
            style={{ borderColor: 'var(--to-border)', background: 'var(--to-surface)' }}
          >
            <div className="text-sm">
              <span className="font-medium">Total Hours:</span> {previewHours}
            </div>
            <div className="text-sm">
              <span className="font-medium">Total Units:</span> {previewUnits}
            </div>
            {!isCreate ? (
              <div className="text-xs text-[var(--to-ink-muted)]">Totals are computed by the database.</div>
            ) : (
              <div className="text-xs text-[var(--to-ink-muted)]">Preview totals (computed from inputs).</div>
            )}
          </div>
        </div>
      </div>
    </AdminOverlay>
  )
}
