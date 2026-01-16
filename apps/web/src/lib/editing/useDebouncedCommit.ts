// apps/web/src/lib/editing/useDebouncedCommit.ts
'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * Debounce async commits keyed by string.
 * - schedule(key, fn): runs fn after delay; re-scheduling resets timer
 * - stale response protection via sequence numbers
 * - auto-cleanup on unmount
 */
export function useDebouncedCommit(delayMs: number) {
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const seq = useRef<Map<string, number>>(new Map())

  const cancel = useCallback((key: string) => {
    const t = timers.current.get(key)
    if (t) clearTimeout(t)
    timers.current.delete(key)
  }, [])

  const cancelAll = useCallback(() => {
    for (const t of timers.current.values()) clearTimeout(t)
    timers.current.clear()
    seq.current.clear()
  }, [])

  useEffect(() => cancelAll, [cancelAll])

  const schedule = useCallback(
    (key: string, fn: () => Promise<void>) => {
      cancel(key)

      const nextSeq = (seq.current.get(key) ?? 0) + 1
      seq.current.set(key, nextSeq)

      const t = setTimeout(async () => {
        try {
          const mySeq = nextSeq
          await fn()
          // If a newer schedule happened while fn was running, ignore follow-up work in caller.
          // Caller can check seq via getSeq(key) if needed.
          if ((seq.current.get(key) ?? 0) !== mySeq) return
        } finally {
          timers.current.delete(key)
        }
      }, delayMs)

      timers.current.set(key, t)
    },
    [cancel, delayMs]
  )

  const getSeq = useCallback((key: string) => seq.current.get(key) ?? 0, [])

  return { schedule, cancel, cancelAll, getSeq }
}
