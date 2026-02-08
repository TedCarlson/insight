"use client";

import { useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordDrawer } from "@/features/admin/catalogue/components/RecordDrawer";
import {
  PcOrgForm,
  type PcOrgDraft,
  type LookupOption,
} from "@/features/admin/catalogue/components/forms/PcOrgForm";
import { usePcOrgAdmin, type PcOrgAdminRow } from "@/features/admin/catalogue/hooks/usePcOrgAdmin";
import { useCatalogueLookups } from "@/features/admin/catalogue/components/lookups/useCatalogueLookups";

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
 * Legacy fallback: Build dropdown options from currently loaded rows.
 * Primary source should be the dedicated lookups endpoint via useCatalogueLookups("pc_org").
 *
 * IMPORTANT: Fulfillment Center is NOT a dropdown (per requirement).
 */
function buildOptionsFromRows(rows: PcOrgAdminRow[]) {
  const byKey = (id: unknown) => (id == null ? "" : String(id));
  const add = (m: Map<string, LookupOption>, id: unknown, label: unknown, sublabel?: unknown) => {
    const k = byKey(id);
    if (!k) return;
    if (m.has(k)) return;
    const lbl = label == null ? "" : String(label).trim();
    m.set(k, {
      id: k,
      label: lbl || k,
      sublabel: sublabel == null ? undefined : String(sublabel),
    });
  };

  const pc = new Map<string, LookupOption>();
  const mso = new Map<string, LookupOption>();
  const division = new Map<string, LookupOption>();
  const region = new Map<string, LookupOption>();

  for (const r of rows) {
    const anyRow = r as any;

    // PC
    const pcLabel =
      anyRow.pc_number != null ? `PC ${anyRow.pc_number}` : anyRow.pc_name ?? anyRow.pc_code ?? undefined;
    add(pc, r.pc_id, pcLabel, r.pc_id);

    // MSO
    add(mso, r.mso_id, anyRow.mso_name ?? anyRow.mso_label, r.mso_id);

    // Division
    const divLabel =
      anyRow.division_name && anyRow.division_code
        ? `${anyRow.division_name} (${anyRow.division_code})`
        : anyRow.division_name ?? anyRow.division_code;
    add(division, r.division_id, divLabel, r.division_id);

    // Region
    const regLabel =
      anyRow.region_name && anyRow.region_code
        ? `${anyRow.region_name} (${anyRow.region_code})`
        : anyRow.region_name ?? anyRow.region_code;
    add(region, r.region_id, regLabel, r.region_id);
  }

  const sort = (a: LookupOption, b: LookupOption) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" });

  return {
    pcOptions: Array.from(pc.values()).sort(sort),
    msoOptions: Array.from(mso.values()).sort(sort),
    divisionOptions: Array.from(division.values()).sort(sort),
    regionOptions: Array.from(region.values()).sort(sort),
  };
}

function emptyDraft(): PcOrgDraft {
  return {
    pc_org_name: "",
    fulfillment_center_id: null,
    fulfillment_center_name: "",
    pc_id: null,
    mso_id: null,
    division_id: null,
    region_id: null,
  };
}

export function PcOrgTableView() {
  const { q, setQ, data, loading, err, pageIndex, setPageIndex, pageSize, setPageSize, refresh } =
    usePcOrgAdmin({ pageSize: 25 });

  const totalRows = data?.page.totalRows ?? undefined;
  const canPrev = pageIndex > 0;
  const canNext = totalRows == null ? true : (pageIndex + 1) * pageSize < totalRows;

  const rawRows = data?.rows;
  const rows = useMemo<PcOrgAdminRow[]>(() => rawRows ?? [], [rawRows]);

  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (err) return "Error";
    if (!data) return "";
    if (totalRows != null) return `${totalRows} rows`;
    return `${rows.length} rows`;
  }, [loading, err, data, totalRows, rows.length]);

  // Dedicated lookups (domain-shaped). This is the primary dropdown source.
  const { data: lookups, error: lookupsErr } = useCatalogueLookups("pc_org");

  // Fallback options from current page (only used if lookups are not available)
  const fallback = useMemo(() => buildOptionsFromRows(rows), [rows]);

  const pcOptions = ((lookups as any)?.pc as LookupOption[] | undefined) ?? fallback.pcOptions;
  const msoOptions = ((lookups as any)?.mso as LookupOption[] | undefined) ?? fallback.msoOptions;
  const divisionOptions = ((lookups as any)?.division as LookupOption[] | undefined) ?? fallback.divisionOptions;
  const regionOptions = ((lookups as any)?.region as LookupOption[] | undefined) ?? fallback.regionOptions;

  // drawer state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [active, setActive] = useState<PcOrgAdminRow | null>(null);
  const [draft, setDraft] = useState<PcOrgDraft | null>(null);
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

  const onCreate = useCallback(() => {
    setMode("create");
    setActive(null);
    setDraft(emptyDraft());
    setSaveErr(null);
    setSaving(false);
    setOpen(true);
  }, []);

  const onEdit = useCallback((row: PcOrgAdminRow) => {
    setMode("edit");
    setActive(row);
    setDraft({
      pc_org_name: row.pc_org_name ?? "",
      fulfillment_center_id: row.fulfillment_center_id ?? null,
      fulfillment_center_name: row.fulfillment_center_name ?? "",
      pc_id: row.pc_id ?? null,
      mso_id: row.mso_id ?? null,
      division_id: row.division_id ?? null,
      region_id: row.region_id ?? null,
    });
    setSaveErr(null);
    setSaving(false);
    setOpen(true);
  }, []);

  const canSave = !!draft && !saving;

  const onSave = useCallback(async () => {
    if (!draft) return;

    setSaving(true);
    setSaveErr(null);

    try {
      const url =
        mode === "create"
          ? `/api/admin/catalogue/pc_org`
          : `/api/admin/catalogue/pc_org/${encodeURIComponent(active!.pc_org_id)}`;

      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Save failed");

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
          <h2 className="text-lg font-semibold">PC-ORG</h2>
          <div className="text-xs text-[var(--to-ink-muted)]">Table: pc_org • {summary}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[280px]">
            <TextInput value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search PC-ORG or FC…" />
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
            onClick={onCreate}
            disabled={loading}
          >
            Add PC-ORG
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

      {lookupsErr ? (
        <Card variant="subtle" className="p-3">
          <div className="text-sm" style={{ color: "var(--to-ink-muted)" }}>
            Lookups error: {lookupsErr} (dropdowns may be incomplete)
          </div>
        </Card>
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState title="No PC-ORGs found" message="Try adjusting your search." compact />
      ) : (
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-2 whitespace-nowrap">PC-ORG</th>
                <th className="px-3 py-2 whitespace-nowrap">FC</th>
                <th className="px-3 py-2 whitespace-nowrap">PC</th>
                <th className="px-3 py-2 whitespace-nowrap">MSO</th>
                <th className="px-3 py-2 whitespace-nowrap">Division</th>
                <th className="px-3 py-2 whitespace-nowrap">Region</th>
                <th className="px-3 py-2 whitespace-nowrap">UUID</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r: PcOrgAdminRow, idx: number) => {
                const anyRow = r as any;

                const fcLabel = labelOrId(r.fulfillment_center_name, r.fulfillment_center_id);

                const pcLabel =
                  anyRow.pc_number != null ? `PC ${anyRow.pc_number}` : labelOrId(anyRow.pc_name, r.pc_id);

                const msoLabel = labelOrId(anyRow.mso_name, r.mso_id);

                const divisionLabel =
                  anyRow.division_name && anyRow.division_code
                    ? `${anyRow.division_name} (${anyRow.division_code})`
                    : labelOrId(anyRow.division_name ?? anyRow.division_code, r.division_id);

                const regionLabel =
                  anyRow.region_name && anyRow.region_code
                    ? `${anyRow.region_name} (${anyRow.region_code})`
                    : labelOrId(anyRow.region_name ?? anyRow.region_code, r.region_id);

                return (
                  <tr
                    key={r.pc_org_id}
                    className={idx % 2 === 1 ? "bg-[var(--to-surface)]" : "bg-[var(--to-surface-soft)]"}
                  >
                    <td className="px-3 py-2 font-medium">
                      <div className="grid">
                        <div>{r.pc_org_name ?? "—"}</div>
                        <div className="text-xs text-[var(--to-ink-muted)]">{fcLabel}</div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="grid">
                        <div className="text-sm">{fcLabel}</div>
                        <div className="text-xs font-mono text-[var(--to-ink-muted)]">
                          {shortId(r.fulfillment_center_id)}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="grid">
                        <div className="text-sm">{pcLabel}</div>
                        <div className="text-xs font-mono text-[var(--to-ink-muted)]">{shortId(r.pc_id)}</div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="grid">
                        <div className="text-sm">{msoLabel}</div>
                        <div className="text-xs font-mono text-[var(--to-ink-muted)]">{shortId(r.mso_id)}</div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="grid">
                        <div className="text-sm">{divisionLabel}</div>
                        <div className="text-xs font-mono text-[var(--to-ink-muted)]">
                          {shortId(r.division_id)}
                        </div>
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="grid">
                        <div className="text-sm">{regionLabel}</div>
                        <div className="text-xs font-mono text-[var(--to-ink-muted)]">{shortId(r.region_id)}</div>
                      </div>
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[var(--to-ink-muted)]">{shortId(r.pc_org_id)}</span>
                        <CopyUuidButton value={r.pc_org_id} />
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
          mode === "create"
            ? "Add PC-ORG"
            : active
              ? `Edit PC-ORG • ${active.pc_org_name ?? shortId(active.pc_org_id)}`
              : "Edit PC-ORG"
        }
        subtitle={mode === "edit" && active ? `UUID: ${active.pc_org_id}` : undefined}
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
        {draft ? (
          <PcOrgForm
            value={draft}
            onChange={setDraft}
            pcOptions={pcOptions}
            msoOptions={msoOptions}
            divisionOptions={divisionOptions}
            regionOptions={regionOptions}
          />
        ) : null}
      </RecordDrawer>
    </div>
  );
}