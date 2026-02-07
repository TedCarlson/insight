// apps/web/src/features/admin/catalogue/components/RecordDrawer.tsx
"use client";

import type { ReactNode } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";

export function RecordDrawer(props: {
  open: boolean;
  onClose: () => void;

  title: string;
  subtitle?: string;

  children: ReactNode;

  // Optional: allow caller to fully control footer if they want
  footer?: ReactNode;

  // New: standard edit pattern (works for PC-ORG and all future tables)
  saving?: boolean;
  error?: string | null;

  onSave?: () => void | Promise<void>;
  saveLabel?: string;

  widthClassName?: string;
}) {
  const {
    open,
    onClose,
    title,
    subtitle,
    children,

    footer,

    saving = false,
    error = null,

    onSave,
    saveLabel = "Save",

    widthClassName,
  } = props;

  const footerNode =
    footer ??
    (
      <>
        <Button variant="ghost" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        {onSave ? (
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : saveLabel}
          </Button>
        ) : null}
      </>
    );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      widthClass={widthClassName ?? "w-[600px]"}
      footer={footerNode}
    >
      {error ? (
        <div
          className="mb-3 rounded border px-3 py-2 text-sm"
          style={{ borderColor: "var(--to-danger)", color: "var(--to-danger)", background: "var(--to-surface-soft)" }}
        >
          {error}
        </div>
      ) : null}

      {children}
    </Drawer>
  );
}