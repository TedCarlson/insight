"use client";

import { useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordDrawer } from "@/features/admin/catalogue/components/RecordDrawer";
import { DivisionForm, type DivisionDraft } from "@/features/admin/catalogue/components/forms/DivisionForm";
import { useDivisionAdmin, type DivisionAdminRow } from "@/features/admin/catalogue/hooks/useDivisionAdmin";

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

export function DivisionTableView() {
  const { q, setQ, data, loading, err, pageIndex, setPageIndex, pageSize, setPageSize, refresh } =
    useDivisionAdmin({ pageSize: 25 });

  const totalRows = data?.page.totalRows ?? undefined;
  const canPrev = pageIndex > 0;
  const canNext = totalRows == null ? true : (pageIndex + 1) * pageSize < totalRows;

  const rawRows = data?.rows;
  const rows = useMemo<DivisionAdminRow[]>(() => rawRows ?? [], [rawRows]);

  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (err) return "Error";
    if (!data) return "";
    if (totalRows != null) return `${totalRows} rows`;
    return `${rows.length} rows`;
  }, [loading, err, data, totalRows, rows.length]);

  // drawer state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [active, setActive] = useState<DivisionAdminRow | null>(null);
  const [draft, setDraft] = useState<DivisionDraft | null>(null);
  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setMode("edit");
    setActive(null);
    setDraft(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const onAdd = useCallback(() => {
    setMode("create");
    setActive(null);
    setDraft({ division_name: "", division_code: "" });
    setSaveErr(null);
    setOpen(true);
  }, []);

  const onEdit = useCallback((row: DivisionAdminRow) => {
    setMode("edit");
    setActive(row);
    setDraft({
      division_name: row.division_name ?? "",
      division_code: row.division_code ?? "",
    });
    setSaveErr(null);
    setOpen(true);
  }, []);

  const canSave = !!draft && !saving && (mode === "create" || !!active);

  const onSave = useCallback(async () => {
    if (!draft) return;

    setSaving(true);
    setSaveErr(null);

    try {
      if (mode === "create") {
        const res = await fetch(`/api/admin/catalogue/division`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Create failed");
      } else {
        if (!active) return;

        const res = await fetch(`/api/admin/catalogue/division/${encodeURIComponent(active.division_id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Save failed");
      }

      close();
      await refresh();
    } catch (e: any) {
      setSaveErr(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }, [draft, mode, active, close, refresh]);

  const drawerTitle =
    mode === "create"
      ? "Add Division"
      : active
        ? `Edit Division • ${active.division_name ?? shortId(active.division_id)}`
        : "Edit Division";

  const drawerSubtitle =
    mode === "edit" && active ? `UUID: ${active.division_id}` : "Create a new division record.";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Division</h2>
          <div className="text-xs text-[var(--to-ink-muted)]">Table: division • {summary}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[280px]">
            <TextInput value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search name or code…" />
          </div>

          <button
            type="button"
            className="h-9 rounded border px-3 text-sm font-medium"
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
        <EmptyState title="No divisions found" message="Try adjusting your search." compact />
      ) : (
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-2 whitespace-nowrap">Division</th>
                <th className="px-3 py-2 whitespace-nowrap">Code</th>
                <th className="px-3 py-2 whitespace-nowrap">UUID</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.division_id}
                  className={idx % 2 === 1 ? "bg-[var(--to-surface)]" : "bg-[var(--to-surface-soft)]"}
                >
                  <td className="px-3 py-2 font-medium">{r.division_name ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded border px-2 py-1 text-xs font-medium" style={{ borderColor: "var(--to-border)" }}>
                      {r.division_code ?? "—"}
                    </span>
                  </td>

                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--to-ink-muted)]">{shortId(r.division_id)}</span>
                      <CopyUuidButton value={r.division_id} />
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
        title={drawerTitle}
        subtitle={drawerSubtitle}
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
              >
                {saving ? "Saving…" : mode === "create" ? "Create" : "Save changes"}
              </button>
            </div>
          </div>
        }
      >
        {draft ? <DivisionForm value={draft} onChange={setDraft} /> : null}
      </RecordDrawer>
    </div>
  );
}