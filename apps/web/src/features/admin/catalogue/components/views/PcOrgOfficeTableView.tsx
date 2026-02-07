"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordDrawer } from "@/features/admin/catalogue/components/RecordDrawer";
import {
  PcOrgOfficeForm,
  type PcOrgOfficeDraft,
  type LookupOption,
} from "@/features/admin/catalogue/components/forms/PcOrgOfficeForm";
import {
  usePcOrgOfficeAdmin,
  type PcOrgOfficeAdminRow,
} from "@/features/admin/catalogue/hooks/usePcOrgOfficeAdmin";

function shortId(id: unknown) {
  if (id == null) return "—";
  const s = String(id);
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function labelOrId(label: unknown, id: unknown) {
  const lbl = label == null ? "" : String(label).trim();
  return lbl ? lbl : shortId(id);
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

/**
 * Lightweight lookups:
 * - Pulls a big page from existing catalogue endpoints
 * - Only needs id + name for dropdowns
 */
async function fetchLookup(table: "pc_org" | "office"): Promise<LookupOption[]> {
  const sp = new URLSearchParams();
  sp.set("pageIndex", "0");
  sp.set("pageSize", "500"); // good enough for now

  const res = await fetch(`/api/admin/catalogue/${table}?${sp.toString()}`);
  const json = (await res.json()) as { rows?: any[]; error?: string };

  if (!res.ok) throw new Error(json.error ?? `Failed to load ${table} lookups`);

  const rows = json.rows ?? [];
  if (table === "pc_org") {
    return rows
      .map((r) => ({
        id: String(r.pc_org_id),
        label: String(r.pc_org_name ?? r.pc_org_id),
        sublabel: String(r.pc_org_id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }

  // office
  return rows
    .map((r) => {
      const name = r.office_name ?? r.office_label ?? r.office_code ?? r.office_id;
      const code = r.office_code ? `(${r.office_code})` : "";
      return {
        id: String(r.office_id),
        label: `${String(name)}${code ? " " + code : ""}`,
        sublabel: String(r.office_id),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}

export function PcOrgOfficeTableView() {
  const { q, setQ, data, loading, err, pageIndex, setPageIndex, pageSize, setPageSize, refresh } =
    usePcOrgOfficeAdmin({ pageSize: 25 });

  const totalRows = data?.page.totalRows ?? undefined;
  const canPrev = pageIndex > 0;
  const canNext = totalRows == null ? true : (pageIndex + 1) * pageSize < totalRows;

  const rawRows = data?.rows;
  const rows = useMemo<PcOrgOfficeAdminRow[]>(() => rawRows ?? [], [rawRows]);

  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (err) return "Error";
    if (!data) return "";
    if (totalRows != null) return `${totalRows} rows`;
    return `${rows.length} rows`;
  }, [loading, err, data, totalRows, rows.length]);

  // Drawer state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [active, setActive] = useState<PcOrgOfficeAdminRow | null>(null);
  const [draft, setDraft] = useState<PcOrgOfficeDraft | null>(null);

  const [pcOrgOptions, setPcOrgOptions] = useState<LookupOption[]>([]);
  const [officeOptions, setOfficeOptions] = useState<LookupOption[]>([]);
  const [lookupsErr, setLookupsErr] = useState<string | null>(null);

  const [saveErr, setSaveErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setMode("add");
    setActive(null);
    setDraft(null);
    setLookupsErr(null);
    setSaveErr(null);
    setSaving(false);
  }, []);

  const loadLookups = useCallback(async () => {
    setLookupsErr(null);
    try {
      const [pcs, offices] = await Promise.all([fetchLookup("pc_org"), fetchLookup("office")]);
      setPcOrgOptions(pcs);
      setOfficeOptions(offices);
    } catch (e: any) {
      setLookupsErr(e?.message ?? "Failed to load lookups");
      setPcOrgOptions([]);
      setOfficeOptions([]);
    }
  }, []);

  const onAdd = useCallback(async () => {
    setMode("add");
    setActive(null);
    setDraft({ pc_org_id: null, office_id: null });
    setSaveErr(null);
    await loadLookups();
    setOpen(true);
  }, [loadLookups]);

  const onEdit = useCallback(
    async (row: PcOrgOfficeAdminRow) => {
      setMode("edit");
      setActive(row);
      setDraft({
        pc_org_id: row.pc_org_id ?? null,
        office_id: row.office_id ?? null,
      });
      setSaveErr(null);
      await loadLookups();
      setOpen(true);
    },
    [loadLookups]
  );

  const canSave = !!draft && !saving && !!draft.pc_org_id && !!draft.office_id;

  const onSave = useCallback(async () => {
    if (!draft) return;

    setSaving(true);
    setSaveErr(null);

    try {
      if (mode === "add") {
        const res = await fetch(`/api/admin/catalogue/pc_org_office`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });

        const json = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok) throw new Error(json.error ?? "Create failed");
      } else {
        if (!active) throw new Error("Missing active row");

        const res = await fetch(`/api/admin/catalogue/pc_org_office/${encodeURIComponent(active.pc_org_office_id)}`, {
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
  }, [active, close, draft, mode, refresh]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">PC-ORG ↔ Office</h2>
          <div className="text-xs text-[var(--to-ink-muted)]">Table: pc_org_office • {summary}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[300px]">
            <TextInput
              value={q}
              onChange={(e: any) => setQ(e.target.value)}
              placeholder="Search PC-ORG or Office…"
            />
          </div>

          <button
            type="button"
            className="to-btn to-btn--primary inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
            onClick={() => void onAdd()}
            disabled={loading}
          >
            Add link
          </button>

          <button
            type="button"
            className="to-btn inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
            style={{ borderColor: "var(--to-border)" }}
            onClick={() => refresh()}
            disabled={loading}
          >
            Refresh
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
        <EmptyState title="No links found" message="Try adjusting your search, or add a new link." compact />
      ) : (
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-2 whitespace-nowrap">PC-ORG</th>
                <th className="px-3 py-2 whitespace-nowrap">Office</th>
                <th className="px-3 py-2 whitespace-nowrap">UUID</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => {
                const pcOrgLabel = labelOrId(r.pc_org_name, r.pc_org_id);
                const officeLabel =
                  r.office_name && r.office_code
                    ? `${r.office_name} (${r.office_code})`
                    : labelOrId(r.office_name ?? r.office_code, r.office_id);

                return (
                  <tr
                    key={r.pc_org_office_id}
                    className={idx % 2 === 1 ? "bg-[var(--to-surface)]" : "bg-[var(--to-surface-soft)]"}
                  >
                    <td className="px-3 py-2">
                      <div className="grid">
                        <div className="font-medium">{pcOrgLabel}</div>
                        <div className="text-xs font-mono text-[var(--to-ink-muted)]">{shortId(r.pc_org_id)}</div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="grid">
                        <div className="font-medium">{officeLabel}</div>
                        <div className="text-xs font-mono text-[var(--to-ink-muted)]">{shortId(r.office_id)}</div>
                      </div>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[var(--to-ink-muted)]">{shortId(r.pc_org_office_id)}</span>
                        <CopyUuidButton value={r.pc_org_office_id} />
                      </div>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        type="button"
                        className="to-btn inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm font-medium"
                        style={{ borderColor: "var(--to-border)" }}
                        onClick={() => void onEdit(r)}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
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
        title={
          mode === "add"
            ? "Add PC-ORG ↔ Office link"
            : active
              ? `Edit link • ${labelOrId(active.pc_org_name, active.pc_org_id)}`
              : "Edit link"
        }
        subtitle={
          mode === "edit" && active ? `UUID: ${active.pc_org_office_id}` : "This creates a relationship link row."
        }
        footer={
          <div className="flex items-center justify-between gap-3">
            <div className="min-h-[20px] text-sm" style={{ color: "var(--to-danger)" }}>
              {saveErr ?? lookupsErr ?? ""}
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
                title={!draft?.pc_org_id || !draft?.office_id ? "Select both PC-ORG and Office" : undefined}
              >
                {saving ? "Saving…" : mode === "add" ? "Create link" : "Save changes"}
              </button>
            </div>
          </div>
        }
      >
        {draft ? (
          <PcOrgOfficeForm
            value={draft}
            onChange={setDraft}
            pcOrgOptions={pcOrgOptions}
            officeOptions={officeOptions}
          />
        ) : null}
      </RecordDrawer>
    </div>
  );
}