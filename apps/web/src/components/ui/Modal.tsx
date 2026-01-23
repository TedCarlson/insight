// apps/web/src/components/ui/Modal.tsx
"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";

function cls(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    // Prevent background scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW =
    size === "sm" ? "max-w-md" : size === "lg" ? "max-w-3xl" : "max-w-xl";

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        style={{ background: "var(--to-overlay)" }}
      />
      <div className="relative flex h-full w-full items-start justify-center p-4 sm:p-8">
        <div
          className={cls(
            "w-full max-h-[calc(100vh-4rem)] rounded-xl border bg-[var(--to-surface)] shadow-[var(--to-shadow-sm)] flex flex-col",
            maxW
          )}
          style={{ borderColor: "var(--to-border)" }}
          role="dialog"
          aria-modal="true"
        >
          {title ? (
            <div className="border-b px-4 py-3" style={{ borderColor: "var(--to-border)" }}>
              <div className="text-sm font-semibold">{title}</div>
            </div>
          ) : null}

          <div className="px-4 py-4 flex-1 overflow-auto">{children}</div>

          {footer ? (
            <div className="border-t px-4 py-3" style={{ borderColor: "var(--to-border)" }}>
              <div className="flex items-center justify-end gap-2">{footer}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
