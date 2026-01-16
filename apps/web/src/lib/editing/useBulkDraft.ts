// apps/web/src/lib/editing/useBulkDraft.ts
'use client'

import { useCallback, useMemo, useState } from 'react'

/**
 * Generic bulk draft store:
 * - draftById holds partial edits (only dirty fields)
 * - getValue shows draft value if present, else base value
 */
export function useBulkDraft<TId extends string, TRow extends { [k: string]: any }>() {
  const [draftById, setDraftById] = useState<Record<TId, Partial<TRow>>>({} as any)

  const setField = useCallback(
    (id: TId, field: keyof TRow, value: any) => {
      setDraftById((prev) => {
        const cur = prev[id] ?? {}
        const next = { ...cur, [field]: value }
        return { ...prev, [id]: next }
      })
    },
    []
  )

  const clear = useCallback(() => setDraftById({} as any), [])

  const hasAny = useMemo(() => Object.keys(draftById).length > 0, [draftById])

  const getValue = useCallback(
    (base: TRow, field: keyof TRow) => {
      const d = draftById[base.person_id as TId]
      if (!d) return base[field]
      return (field in d ? (d as any)[field] : base[field]) as any
    },
    [draftById]
  )

  return { draftById, setField, clear, hasAny, getValue }
}
