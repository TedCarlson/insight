"use client";

import React from "react";
import { Button } from "@/components/ui/Button";

export function BaselineModal(props: {
  editing: { state_code: string; state_name: string; default_manpower: number; backlog_seed: number };
  saving: boolean;
  onClose: () => void;
  onChange: (next: { default_manpower: number; backlog_seed: number }) => void;
  onSave: () => void;
}) {
  const { editing, saving, onClose, onChange, onSave } = props;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div
        className="w-full max-w-lg rounded-xl border bg-[var(--to-surface)] p-4 shadow-xl"
        style={{ borderColor: "var(--to-border)" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="grid gap-1">
            <div className="text-sm font-medium">Edit baselines</div>
            <div className="text-sm text-[var(--to-ink-muted)]">
              {editing.state_name} ({editing.state_code})
            </div>
          </div>

          <button
            type="button"
            className="rounded border px-2 py-1 text-sm hover:bg-[var(--to-surface-2)]"
            style={{ borderColor: "var(--to-border)" }}
            onClick={onClose}
            disabled={saving}
          >
            Close
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-[var(--to-ink-muted)]">Total manpower (baseline)</span>
            <input
              inputMode="numeric"
              className="to-input h-10"
              value={editing.default_manpower}
              onChange={(e) => onChange({ default_manpower: Number(e.target.value || 0), backlog_seed: editing.backlog_seed })}
              disabled={saving}
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs text-[var(--to-ink-muted)]">Backlog seed</span>
            <input
              inputMode="numeric"
              className="to-input h-10"
              value={editing.backlog_seed}
              onChange={(e) => onChange({ default_manpower: editing.default_manpower, backlog_seed: Number(e.target.value || 0) })}
              disabled={saving}
            />
          </label>

          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={onSave} disabled={saving}>
              {saving ? "Saving…" : "Save baselines"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}