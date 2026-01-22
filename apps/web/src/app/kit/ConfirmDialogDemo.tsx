// apps/web/src/app/kit/ConfirmDialogDemo.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";

export default function ConfirmDialogDemo() {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Delete…
        </Button>
      </div>

      <div className="text-xs text-[var(--to-ink-muted)]">
        Rule: use ConfirmDialog for destructive actions. Keep copy short, calm, and explicit.
      </div>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete record?"
        message="You’re about to permanently delete this record."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          // simulate request
          await new Promise((r) => setTimeout(r, 450));
          toast.push({ title: "Deleted", message: "The record was removed.", variant: "success" });
        }}
      />
    </div>
  );
}
