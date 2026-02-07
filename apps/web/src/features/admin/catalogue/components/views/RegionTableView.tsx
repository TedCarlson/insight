"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordDrawer } from "@/features/admin/catalogue/components/RecordDrawer";
import { RegionForm, type RegionDraft } from "@/features/admin/catalogue/components/forms/RegionForm";
import { useRegionAdmin, type RegionAdminRow } from "@/features/admin/catalogue/hooks/useRegionAdmin";

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

export function RegionTableView() {
  const { q, setQ, data, loading, err, pageIndex, setPageIndex, pageSize, setPageSize, refresh } =
    useRegionAdmin({ pageSize: 25 });

  const totalRows = data?.page.totalRows ?? undefined;
  const canPrev = pageIndex > 0;
  const canNext = totalRows == null ? true : (pageIndex + 1) * pageSize < totalRows;

  const rawRows = data?.rows;
  const rows = useMemo<RegionAdminRow[]>(() => rawRows ?? [], [rawRows]);

  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (err) return "Error";
    if (!data) return "";
    if (totalRows != null) return `${totalRows} rows`;
    return `${rows.length} rows`;
  }, [loading, err, data, totalRows, rows.length]);

  // drawer state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("edit");
  const [active, setActive] = useState<RegionAdminRow | null>(null);
  const [draft, setDraft] = useState<RegionDraft | null>(null);
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
    setMode("add");
    setActive(null);
    setDraft({ region_name: "", region_code: "" });
    setSaveErr(null);
    setOpen(true);
  }, []);

  const onEdit = useCallback((row: RegionAdminRow) => {
    setMode("edit");
    setActive(row);
    setDraft({
      region_name: row.region_name ?? "",
      region_code: row.region_code ?? "",
    });
    setSaveErr(null);
    setOpen(true);
  }, []);

  const canSave = !!draft && !saving && draft.region_name.trim() !== "" && draft.region_code.trim() !== "";

  const onSave = useCallback(async () => {
    if (!draft) return;

    setSaving(true);
    setSaveErr(null);
    try {
      if (mode === "add") {
        const res = await fetch(`/api/admin/catalogue/region`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Create failed");
      } else {
        if (!active) throw new Error("No active record");
        const res = await fetch(`/api/admin/catalogue/region/${encodeURIComponent(active.region_id)}`, {
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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Region</h2>
          <div className="text-xs text-[var(--to-ink-muted)]">Table: region • {summary}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[280px]">
            <TextInput value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search name or code…" />
          </div>

          <button
            type="button"
            className="to-btn inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--to-border)" }}
            onClick={refresh}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            className="to-btn inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--to-border)" }}
            onClick={onAdd}
            disabled={loading}
            title="Add a new Region"
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
        <EmptyState title="No Regions found" message="Try adjusting your search." compact />
      ) : (
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-2 whitespace-nowrap">Name</th>
                <th className="px-3 py-2 whitespace-nowrap">Code</th>
                <th className="px-3 py-2 whitespace-nowrap">UUID</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.region_id}
                  className={idx % 2 === 1 ? "bg-[var(--to-surface)]" : "bg-[var(--to-surface-soft)]"}
                >
                  <td className="px-3 py-2 font-medium">{r.region_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.region_code ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--to-ink-muted)]">{shortId(r.region_id)}</span>
                      <CopyUuidButton value={r.region_id} />
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
        title={mode === "add" ? "Add Region" : `Edit Region • ${active?.region_name ?? shortId(active?.region_id)}`}
        subtitle={mode === "edit" && active ? `UUID: ${active.region_id}` : undefined}
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
                {saving ? "Saving…" : mode === "add" ? "Create" : "Save changes"}
              </button>
            </div>
          </div>
        }
      >
        {draft ? <RegionForm value={draft} onChange={setDraft} /> : null}
      </RecordDrawer>
    </div>
  );
}