// apps/web/src/components/ui/Drawer.tsx
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass = "w-[560px]",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  widthClass?: string; // e.g. "w-[520px]" | "w-[640px]"
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      {/* overlay */}
      <button
        type="button"
        aria-label="Close drawer"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        style={{ background: "var(--to-overlay)" }}
      />

      {/* panel */}
      <div className="absolute inset-y-0 right-0 flex h-full">
        <div
          className={cls(
            "h-full max-w-[95vw] border-l bg-[var(--to-surface)] shadow-[var(--to-shadow-md)] flex flex-col",
            widthClass
          )}
          style={{ borderColor: "var(--to-border)" }}
          role="dialog"
          aria-modal="true"
        >
          {(title || subtitle) && (
            <div className="border-b px-5 py-4" style={{ borderColor: "var(--to-border)" }}>
              {title ? <div className="text-sm font-semibold">{title}</div> : null}
              {subtitle ? <div className="mt-1 text-xs text-[var(--to-ink-muted)]">{subtitle}</div> : null}
            </div>
          )}

          <div className="flex-1 overflow-auto px-5 py-4">{children}</div>

          {footer ? (
            <div className="border-t px-5 py-3" style={{ borderColor: "var(--to-border)" }}>
              <div className="flex items-center justify-end gap-2">{footer}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}