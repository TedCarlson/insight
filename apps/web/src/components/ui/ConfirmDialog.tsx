// apps/web/src/components/ui/ConfirmDialog.tsx
"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

/**
 * ConfirmDialog (pattern)
 * - Use for destructive or irreversible actions (delete, archive, reset).
 * - Built on Modal.
 * - Handles async confirm with a local loading state.
 */
export function ConfirmDialog({
  open,
  onClose,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  message?: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (busy) return;
    try {
      setBusy(true);
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!busy) onClose();
      }}
      title={title}
      footer={
        <>
          <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={tone === "danger" ? "primary" : "primary"}
            disabled={busy}
            onClick={handleConfirm}
          >
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      {message ? <div className="text-sm text-[var(--to-ink-muted)]">{message}</div> : null}
      {tone === "danger" ? (
        <div className="mt-3 text-xs" style={{ color: "var(--to-danger)" }}>
          This action cannot be undone.
        </div>
      ) : null}
    </Modal>
  );
}
