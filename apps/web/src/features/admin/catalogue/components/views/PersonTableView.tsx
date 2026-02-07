"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/TextInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePersonAdmin, type PersonAdminRow } from "../../hooks/usePersonAdmin";

function CopyUuidButton(props: { value: string }) {
  return (
    <button
      type="button"
      className="to-btn inline-flex items-center justify-center rounded-md border px-2 py-1 text-xs"
      style={{ borderColor: "var(--to-border)" }}
      onClick={async () => {
        await navigator.clipboard.writeText(props.value);
      }}
      title="Copy UUID"
    >
      Copy
    </button>
  );
}

export function PersonTableView() {
  const { q, setQ, data, loading, err, pageIndex, setPageIndex, pageSize, setPageSize, refresh } =
    usePersonAdmin({ pageSize: 25 });

  const totalRows = data?.page.totalRows ?? undefined;
  const canPrev = pageIndex > 0;
  const canNext = totalRows == null ? true : (pageIndex + 1) * pageSize < totalRows;

  const rows: PersonAdminRow[] = data?.rows ?? [];

  const summary = useMemo(() => {
    if (loading) return "Loading…";
    if (err) return "Error";
    if (!data) return "";
    if (totalRows != null) return `${totalRows} rows`;
    return `${rows.length} rows`;
  }, [loading, err, data, totalRows, rows.length]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h2 className="text-lg font-semibold">Person</h2>
          <div className="text-xs text-[var(--to-ink-muted)]">Table: person • {summary}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="w-[260px]">
            <TextInput value={q} onChange={(e: any) => setQ(e.target.value)} placeholder="Search name, email…" />
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
        <EmptyState title="No people found" message="Try adjusting your search." compact />
      ) : (
        <div className="overflow-auto rounded border" style={{ borderColor: "var(--to-border)" }}>
          <table className="w-full text-sm">
            <thead className="bg-[var(--to-surface-2)]">
              <tr className="text-left">
                <th className="px-3 py-2 whitespace-nowrap">Name</th>
                <th className="px-3 py-2 whitespace-nowrap">Email</th>
                <th className="px-3 py-2 whitespace-nowrap">NT Login</th>
                <th className="px-3 py-2 whitespace-nowrap">Fuse</th>
                <th className="px-3 py-2 whitespace-nowrap">Active</th>
                <th className="px-3 py-2 whitespace-nowrap">Role</th>
                <th className="px-3 py-2 whitespace-nowrap">UUID</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r: PersonAdminRow, idx: number) => (
                <tr
                  key={r.person_id}
                  className={idx % 2 === 1 ? "bg-[var(--to-surface)]" : "bg-[var(--to-surface-soft)]"}
                >
                  <td className="px-3 py-2 font-medium">{r.full_name ?? "—"}</td>
                  <td className="px-3 py-2">{r.emails ?? "—"}</td>
                  <td className="px-3 py-2">{r.person_nt_login ?? "—"}</td>
                  <td className="px-3 py-2">{r.fuse_emp_id ?? "—"}</td>
                  <td className="px-3 py-2">{r.active == null ? "—" : r.active ? "Yes" : "No"}</td>
                  <td className="px-3 py-2">{r.role ?? "—"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--to-ink-muted)]">{r.person_id}</span>
                      <CopyUuidButton value={r.person_id} />
                    </div>
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
    </div>
  );
}