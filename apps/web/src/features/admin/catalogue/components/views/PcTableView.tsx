"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordDrawer } from "@/features/admin/catalogue/components/RecordDrawer";
import { PcForm } from "@/features/admin/catalogue/components/forms/PcForm";
import { blankPcDraft, draftFromPcRow, usePcAdmin, type PcAdminRow, type PcDraft } from "@/features/admin/catalogue/hooks/usePcAdmin";

function shortId(id: unknown) {
  if (id == null) return "—";
  const s = String(id);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function CopyUuidButton(props: { value: string }) {
  return (
    <button
      type="button"
      className="to-btn inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs"
      style={{ borderColor: "var(--to-border)" }}
      onClick={async () => {
        await navigator.clipboard.writeText(String(props.value));
      }}
      title="Copy UUID"
    >
      Copy
    </button>
  );
}

function isValidInt(s: string) {
  const t = s.trim();
  if (!t) return false;
  const n = Number(t);
  return Number.isInteger(n) && Number.isFinite(n);
}

export function PcTableView() {
  const { q, setQ, data, loading, err, pageIndex, setPageIndex, pageSize, setPageSize, refresh } =
    usePcAdmin({ pageSize: 25 });

  const totalRows = data?.page.totalRows ?? undefined;
  const canPrev = pageIndex > 0;
  const canNext = totalRows == null ? true : (pageIndex + 1) * pageSize < totalRows;

  const rawRows = data?.rows;
  const rows = useMemo<PcAdminRow[]>(() => rawRows ?? [], [rawRows]);

  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (err) return "Error";
    if (!data) return "";
    if (totalRows != null) return `${totalRows} rows`;
    return `${rows.length} rows`;
  }, [loading, err, data, totalRows, rows.length]);

  // drawer state
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PcAdminRow | null>(null); // null => add
  const [draft, setDraft] = useState<PcDraft | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setActive(null);
    setDraft(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const onAdd = useCallback(() => {
    setActive(null);
    setDraft(blankPcDraft());
    setSaveErr(null);
    setOpen(true);
  }, []);

  const onEdit = useCallback((row: PcAdminRow) => {
    setActive(row);
    setDraft(draftFromPcRow(row));
    setSaveErr(null);
    setOpen(true);
  }, []);

  const canSave = !!draft && isValidInt(draft.pc_number) && !saving;

  const onSave = useCallback(async () => {
    if (!draft) return;

    setSaving(true);
    setSaveErr(null);
    try {
      const pc_number = Number(draft.pc_number.trim());
      if (!Number.isInteger(pc_number)) throw new Error("PC number must be an integer");

      const isEdit = !!active;

      const res = await fetch(
        isEdit ? `/api/admin/catalogue/pc/${encodeURIComponent(active!.pc_id)}` : `/api/admin/catalogue/pc`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pc_number }),
        }
      );

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");

      close();
      await refresh();
    } catch (e: any) {
      setSaveErr(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }, [draft, active, close, refresh]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">PC</h2>
          <div className="text-xs text-[var(--to-ink-muted)]">Table: pc • {summary}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[240px]">
            <TextInput
              value={q}
              onChange={(e: any) => setQ(e.target.value)}
              placeholder="Search PC number…"
            />
          </div>

          <button
            type="button"
            className="to-btn inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--to-border)" }}
            onClick={() => refresh()}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            className="to-btn inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--to-border)" }}
            onClick={onAdd}
          >
            Add
          </button>
        </div>
      </div>

      {err ? (
        <Card variant="subtle" className="p-3">
          <div className="text-sm" style={{ color: "var(--to-danger)" }}>
            {err}
          </div>
        </Card>
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState title="No PCs found" message="Try adjusting your search." compact />
      ) : (
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-2 whitespace-nowrap">PC</th>
                <th className="px-3 py-2 whitespace-nowrap">UUID</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r: PcAdminRow, idx: number) => (
                <tr
                  key={r.pc_id}
                  className={idx % 2 === 1 ? "bg-[var(--to-surface)]" : "bg-[var(--to-surface-soft)]"}
                >
                  <td className="px-3 py-2 font-medium">{`PC ${r.pc_number}`}</td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--to-ink-muted)]">{shortId(r.pc_id)}</span>
                      <CopyUuidButton value={r.pc_id} />
                    </div>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap text-right">
                    <button
                      type="button"
                      className="to-btn inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
                      style={{ borderColor: "var(--to-border)" }}
                      onClick={() => onEdit(r)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-[var(--to-ink-muted)]">Page {(pageIndex + 1).toString()}</div>

        <div className="flex items-center gap-2">
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-9 rounded border bg-transparent px-2 text-sm"
            style={{ borderColor: "var(--to-border)" }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>

          <button
            type="button"
            className="h-9 rounded border px-3 text-sm font-medium"
            style={{ borderColor: "var(--to-border)" }}
            onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
            disabled={!canPrev || loading}
          >
            Prev
          </button>

          <button
            type="button"
            className="h-9 rounded border px-3 text-sm font-medium"
            style={{ borderColor: "var(--to-border)" }}
            onClick={() => setPageIndex(pageIndex + 1)}
            disabled={!canNext || loading}
          >
            Next
          </button>
        </div>
      </div>

      <RecordDrawer
        open={open}
        onClose={close}
        title={active ? `Edit PC • ${active.pc_number}` : "Add PC"}
        subtitle={active ? `UUID: ${active.pc_id}` : "Create a new PC row."}
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="min-h-[20px] text-sm" style={{ color: "var(--to-danger)" }}>
              {saveErr ?? ""}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="h-9 rounded border px-3 text-sm font-medium"
                style={{ borderColor: "var(--to-border)" }}
                onClick={close}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="to-btn inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
                style={{ borderColor: "var(--to-border)" }}
                onClick={onSave}
                disabled={!canSave}
                title={!draft?.pc_number.trim() ? "PC number is required" : !isValidInt(draft!.pc_number) ? "Must be an integer" : undefined}
              >
                {saving ? "Saving…" : active ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        }
      >
        {draft ? <PcForm value={draft} onChange={setDraft} /> : null}
      </RecordDrawer>
    </div>
  );
}