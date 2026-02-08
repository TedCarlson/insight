"use client";

import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { RecordDrawer } from "@/features/admin/catalogue/components/RecordDrawer";
import { useAssignmentAdmin, type AssignmentAdminRow } from "@/features/admin/catalogue/hooks/useAssignmentAdmin";
import { AssignmentForm, type AssignmentDraft } from "@/features/admin/catalogue/components/forms/AssignmentForm";
import { useCatalogueLookups } from "@/features/admin/catalogue/components/lookups/useCatalogueLookups";
import type { LookupOption } from "@/features/admin/catalogue/components/forms/PcOrgForm";

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

function emptyDraft(): AssignmentDraft {
  return {
    person_id: null,
    pc_org_id: null,
    office_id: null,
    position_title: null,
    tech_id: null,
    start_date: "",
    end_date: null,
    active: true,
  };
}

export function AssignmentTableView() {
  const { q, setQ, data, loading, err, pageIndex, setPageIndex, pageSize, setPageSize, refresh } =
    useAssignmentAdmin({ pageSize: 25 });

  const totalRows = data?.page.totalRows ?? undefined;
  const canPrev = pageIndex > 0;
  const canNext = totalRows == null ? true : (pageIndex + 1) * pageSize < totalRows;

  const rows = useMemo<AssignmentAdminRow[]>(() => data?.rows ?? [], [data?.rows]);

  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (err) return "Error";
    if (!data) return "";
    if (totalRows != null) return `${totalRows} rows`;
    return `${rows.length} rows`;
  }, [loading, err, data, totalRows, rows.length]);

  const { data: lookups, error: lookupsErr } = useCatalogueLookups("assignment");

  const personOptions = ((lookups as any)?.person as LookupOption[] | undefined) ?? [];
  const pcOrgOptions = ((lookups as any)?.pc_org as LookupOption[] | undefined) ?? [];
  const officeOptions = ((lookups as any)?.office as LookupOption[] | undefined) ?? [];
  const positionTitleOptions = ((lookups as any)?.position_title as LookupOption[] | undefined) ?? [];

  // drawer state
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [active, setActive] = useState<AssignmentAdminRow | null>(null);
  const [draft, setDraft] = useState<AssignmentDraft | null>(null);
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

  const onEdit = useCallback((row: AssignmentAdminRow) => {
    setMode("edit");
    setActive(row);
    setDraft({
      person_id: row.person_id ?? null,
      pc_org_id: row.pc_org_id ?? null,
      office_id: row.office_id ?? null,
      position_title: row.position_title ?? null,
      tech_id: row.tech_id ?? null,
      start_date: row.start_date ?? "",
      end_date: row.end_date ?? null,
      active: Boolean(row.active ?? true),
    });
    setSaveErr(null);
    setSaving(false);
    setOpen(true);
  }, []);

  const canSave = useMemo(() => {
    if (!draft || saving) return false;
    if (!draft.start_date || String(draft.start_date).trim() === "") return false;
    if (mode === "create") {
      if (!draft.person_id) return false;
      if (!draft.pc_org_id) return false;
    }
    return true;
  }, [draft, saving, mode]);

  const onSave = useCallback(async () => {
    if (!draft) return;

    setSaving(true);
    setSaveErr(null);

    try {
      const url =
        mode === "create"
          ? `/api/admin/catalogue/assignment`
          : `/api/admin/catalogue/assignment/${encodeURIComponent(active!.assignment_id)}`;

      const method = mode === "create" ? "POST" : "PATCH";

      // Only send editable fields; keep PATCH non-destructive
      const body: Record<string, unknown> = {
        tech_id: draft.tech_id,
        start_date: draft.start_date,
        end_date: draft.end_date,
        position_title: draft.position_title,
        active: draft.active,
        office_id: draft.office_id,
      };

      if (mode === "create") {
        body.person_id = draft.person_id;
        body.pc_org_id = draft.pc_org_id;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          <h2 className="text-lg font-semibold">ASSIGNMENT</h2>
          <div className="text-xs text-[var(--to-ink-muted)]">Table: assignment • {summary}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[320px]">
            <TextInput value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search person, pc-org, tech_id…" />
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
            Add Assignment
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
            Lookups error: {lookupsErr} (form dropdowns may be empty)
          </div>
        </Card>
      ) : null}

      {!loading && rows.length === 0 ? (
        <EmptyState title="No assignments found" message="Try adjusting your search." compact />
      ) : (
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-2 whitespace-nowrap">Person</th>
                <th className="px-3 py-2 whitespace-nowrap">PC-Org</th>
                <th className="px-3 py-2 whitespace-nowrap">Office</th>
                <th className="px-3 py-2 whitespace-nowrap">Position</th>
                <th className="px-3 py-2 whitespace-nowrap">Dates</th>
                <th className="px-3 py-2 whitespace-nowrap">Active</th>
                <th className="px-3 py-2 whitespace-nowrap">UUID</th>
                <th className="px-3 py-2 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.assignment_id}
                  className={idx % 2 === 1 ? "bg-[var(--to-surface)]" : "bg-[var(--to-surface-soft)]"}
                >
                  <td className="px-3 py-2 font-medium">{r.person_full_name ?? shortId(r.person_id)}</td>
                  <td className="px-3 py-2">{r.pc_org_name ?? shortId(r.pc_org_id)}</td>
                  <td className="px-3 py-2">{r.office_name ?? (r.office_id ? shortId(r.office_id) : "—")}</td>
                  <td className="px-3 py-2">{r.position_title ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="grid">
                      <div>{r.start_date}</div>
                      <div className="text-xs text-[var(--to-ink-muted)]">{r.end_date ? `→ ${r.end_date}` : "→ (open)"}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{(r.active ?? true) ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--to-ink-muted)]">{shortId(r.assignment_id)}</span>
                      <CopyUuidButton value={r.assignment_id} />
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
        title={
          mode === "create"
            ? "Add Assignment"
            : active
              ? `Edit Assignment • ${active.person_full_name ?? shortId(active.person_id)}`
              : "Edit Assignment"
        }
        subtitle={mode === "edit" && active ? `UUID: ${active.assignment_id}` : undefined}
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
          <AssignmentForm
            value={draft}
            onChange={setDraft}
            personOptions={personOptions}
            pcOrgOptions={pcOrgOptions}
            officeOptions={officeOptions}
            positionTitleOptions={positionTitleOptions}
          />
        ) : null}
      </RecordDrawer>
    </div>
  );
}