//apps/web/src/app/(prod)/_shared/AdminOverlay.tsx

'use client'

import { useEffect, useId, useRef } from 'react'
import { toBtnNeutral } from './toStyles'

type Mode = 'create' | 'edit'

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/**
 * AdminOverlay
 * Centralized overlay chrome for Admin Inspectors:
 * - Backdrop
 * - Panel background (fixes "transparent overlay" issues)
 * - Header color by mode
 * - Border/shadow/radius
 * - ESC close
 * - Body scroll lock while open
 * - Accessible dialog semantics
 *
 * Note: Backdrop is inert (no click-to-close) to prevent accidental dismiss.
 */
export default function AdminOverlay(props: {
  open: boolean
  mode: Mode
  title: string
  subtitle?: string
  widthClassName?: string
  onClose: () => void
  headerRight?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  const {
    open,
    mode,
    title,
    subtitle,
    widthClassName = 'w-[860px] max-w-[92vw]',
    onClose,
    headerRight,
    footer,
    children,
  } = props

  const titleId = useId()
  const descId = useId()
  const closeBtnRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    // Lock body scroll while overlay is open
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    window.addEventListener('keydown', onKeyDown)

    // Focus the close button for keyboard users
    // (keeps this lightweight vs a full focus trap)
    setTimeout(() => closeBtnRef.current?.focus(), 0)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const headerBg =
    mode === 'create' ? 'bg-[var(--to-blue-100)]' : 'bg-[var(--to-green-100)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop (INERT - no click handler) */}
      <div className="absolute inset-0 bg-black/35" aria-hidden="true" />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? descId : undefined}
        className={cx(
          'relative max-h-[88vh] rounded-2xl border border-[var(--to-border)]',
          'shadow-[var(--to-shadow-md)] bg-[var(--to-surface)] text-[var(--to-ink)]',
          'flex flex-col overflow-hidden',
          widthClassName
        )}
      >
        {/* Header */}
        <div className={cx('sticky top-0 z-10 border-b border-[var(--to-border)] px-5 py-4', headerBg)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div id={titleId} className="text-sm font-semibold text-[var(--to-ink)]">
                {title}
              </div>
              {subtitle ? (
                <div id={descId} className="text-xs text-[var(--to-ink-muted)]">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {headerRight}
              <button
                ref={closeBtnRef}
                className={cx(toBtnNeutral, 'px-2 py-1 text-sm')}
                onClick={onClose}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-5 py-4">{children}</div>

        {/* Footer (optional) */}
        {footer ? (
          <div className="sticky bottom-0 border-t border-[var(--to-border)] bg-[var(--to-surface)] px-5 py-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
