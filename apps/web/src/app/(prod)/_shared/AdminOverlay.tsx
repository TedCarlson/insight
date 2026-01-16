'use client'

import { useEffect } from 'react'

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
 * - ESC close (no click-off close)
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

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  const headerBg =
    mode === 'create' ? 'bg-[var(--to-blue-100)]' : 'bg-[var(--to-green-100)]'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop (INERT - no click handler) */}
      <div className="absolute inset-0 bg-black/35" />

      {/* Panel */}
      <div
        className={cx(
          'relative max-h-[88vh] rounded-2xl border shadow-[var(--to-shadow-md)]',
          'bg-[var(--to-surface)] text-[var(--to-ink)]',
          'flex flex-col overflow-hidden',
          widthClassName
        )}
        style={{ borderColor: 'var(--to-border)' }}
      >
        {/* Header */}
        <div
          className={cx('sticky top-0 z-10 border-b px-5 py-4', headerBg)}
          style={{ borderColor: 'var(--to-border)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--to-ink)]">
                {title}
              </div>
              {subtitle ? (
                <div className="text-xs text-[var(--to-ink-muted)]">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              {headerRight}
              <button
                className="rounded border px-2 py-1 text-sm bg-white"
                style={{ borderColor: 'var(--to-border)' }}
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
          <div
            className="sticky bottom-0 border-t px-5 py-3 bg-[var(--to-surface)]"
            style={{ borderColor: 'var(--to-border)' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
