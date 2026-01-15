// apps/web/src/app/(prod)/person/PersonForm.tsx

'use client'

import { useEffect, useState } from 'react'
import { PersonRow } from './person.types'
import { updatePersonEmployer } from './person.api'
import { fetchCompanyOptions, CompanyOption } from '../_shared/dropdowns'

interface PersonFormProps {
  person: PersonRow
  onUpdated: (person: PersonRow) => void
}

export default function PersonForm({ person, onUpdated }: PersonFormProps) {
  const [options, setOptions] = useState<CompanyOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // local editable state
  const [form, setForm] = useState({
    emails: person.emails ?? '',
    mobile: person.mobile ?? '',
    person_notes: person.person_notes ?? '',
    fuse_emp_id: person.fuse_emp_id ?? '',
    person_nt_login: person.person_nt_login ?? '',
    person_csg_id: person.person_csg_id ?? '',
    co_ref_id: person.co_ref_id ?? '',
  })

  /**
   * Load company / contractor options
   */
  useEffect(() => {
    fetchCompanyOptions()
      .then(setOptions)
      .catch((err) => {
        console.error('dropdown load failed', err)
        setError('Failed to load company list')
      })
  }, [])

  /**
   * Generic change handler
   */
  function updateField<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  /**
   * Persist change (save-on-change)
   */
  async function persistChange(
    payload: Partial<PersonRow>
  ) {
    setLoading(true)
    setError(null)

    try {
      const updated = await updatePersonEmployer(person.person_id, {
        co_ref_id: payload.co_ref_id ?? person.co_ref_id,
        co_code: payload.co_code ?? person.co_code,
      })

      onUpdated(updated)
    } catch (err) {
      console.error('update failed', err)
      setError('Update failed')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle company selection
   */
  async function handleCompanyChange(value: string) {
    updateField('co_ref_id', value)

    const selected = options.find((o) => o.id === value)

    await persistChange({
      co_ref_id: selected ? selected.id : null,
      co_code: selected ? selected.code : null,
    })
  }

  return (
    <div className="space-y-2">
      {/* Company / Contractor */}
      <select
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        value={form.co_ref_id}
        disabled={loading}
        onChange={(e) => handleCompanyChange(e.target.value)}
      >
        <option value="">— Unassigned —</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Emails */}
      <input
        type="text"
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        placeholder="Emails"
        value={form.emails}
        onChange={(e) => updateField('emails', e.target.value)}
      />

      {/* Mobile */}
      <input
        type="text"
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        placeholder="Mobile"
        value={form.mobile}
        onChange={(e) => updateField('mobile', e.target.value)}
      />

      {/* Notes */}
      <textarea
        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
        placeholder="Notes"
        rows={2}
        value={form.person_notes}
        onChange={(e) => updateField('person_notes', e.target.value)}
      />

      {/* Identifiers */}
      <input
        type="text"
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        placeholder="Fuse ID"
        value={form.fuse_emp_id}
        onChange={(e) => updateField('fuse_emp_id', e.target.value)}
      />

      <input
        type="text"
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        placeholder="NT Login"
        value={form.person_nt_login}
        onChange={(e) => updateField('person_nt_login', e.target.value)}
      />

      <input
        type="text"
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        placeholder="CSG ID"
        value={form.person_csg_id}
        onChange={(e) => updateField('person_csg_id', e.target.value)}
      />

      {/* System Fields */}
      <div className="text-xs text-gray-500">
        Created: {new Date(person.created_at).toLocaleString()}
        <br />
        Updated: {new Date(person.updated_at).toLocaleString()}
      </div>

      {loading && (
        <div className="text-xs text-gray-500">Saving…</div>
      )}

      {error && (
        <div className="text-xs text-red-600">{error}</div>
      )}
    </div>
  )
}
