// apps/web/src/app/dev/kit/ModalDemo.tsx
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { Field } from "@/components/ui/Field";

export default function ModalDemo() {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="primary" onClick={() => setOpen(true)}>
          Open modal
        </Button>
        <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
          Open (secondary)
        </Button>
      </div>

      <div className="text-xs text-[var(--to-ink-muted)]">
        Rule: use <code className="rounded px-1" style={{ border: "1px solid var(--to-border)" }}>{"<Modal open onClose />"}</code>{" "}
        for create/edit flows. Escape + backdrop click close by default.
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create record"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={() => setOpen(false)}>
              Save
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <TextInput placeholder="Alex Rivera" />
          </Field>
          <Field label="Role">
            <TextInput placeholder="Driver" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
