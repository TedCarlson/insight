"use client";

import { EdgePermissionsToolbar } from "../components/EdgePermissionsToolbar";
import { EdgePermissionsTable } from "../components/EdgePermissionsTable";
import { useEdgePermissions } from "../hooks/useEdgePermissions";
import Link from "next/link";

export function EdgePermissionsPage() {
  const {
    query,
    data,
    loading,
    err,
    permissionKeys,
    pcOrgs,

    setSearch,
    setLob,
    setScope,
    setPcOrgId,
    setPage,
    setPageSize,
    refresh,
    onToggle,
  } = useEdgePermissions({ pageSize: 25, lob: "ALL", scope: "global" });

  const scope = query.scope ?? "global";
  const pcOrgId = query.pcOrgId ?? null;

  const missingPcOrg = scope === "pc_org" && !pcOrgId;

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-xl font-semibold">Edge permissions</h1>
          <p className="text-sm text-[var(--to-ink-muted)]">
            Toggle access for authorized users. Scope controls whether grants apply globally (Admin) or to a specific PC-ORG (delegation).
          </p>
        </div>

        <Link
          href="/admin"
          className="h-8 shrink-0 rounded border px-3 text-xs font-medium flex items-center hover:bg-[var(--to-surface-2)]"
          style={{ borderColor: "var(--to-border)" }}
        >
          ← Admin
        </Link>
      </div>

      <EdgePermissionsToolbar
        search={query.q ?? ""}
        onSearch={setSearch}
        lob={String(query.lob ?? "ALL")}
        onLob={(v) => setLob(v === "ALL" ? "ALL" : v)}
        scope={scope}
        onScope={setScope}
        pcOrgId={pcOrgId}
        pcOrgs={pcOrgs}
        onPcOrgId={setPcOrgId}
        loading={loading}
        onRefresh={refresh}
      />

      {err ? <div className="text-sm text-[var(--to-danger)]">{err}</div> : null}

      {missingPcOrg ? (
        <div
          className="rounded border p-3 text-sm"
          style={{ borderColor: "var(--to-border)", background: "var(--to-surface)" }}
        >
          Select a PC-ORG to manage delegation permissions.
        </div>
      ) : null}

      {!data ? (
        <div className="text-sm text-[var(--to-ink-muted)]">{loading ? "Loading…" : "No data."}</div>
      ) : (
        <EdgePermissionsTable
          rows={data.rows}
          permissionKeys={permissionKeys}
          onToggle={({ authUserId, permissionKey, enabled }) =>
            onToggle({
              scope,
              pcOrgId: scope === "pc_org" ? pcOrgId : null,
              targetAuthUserId: authUserId,
              permissionKey,
              enabled,
              lob: query.lob ?? "ALL",
            })
          }
        />
      )}

      {/* sticky footer: pagination + page size */}
      <div
        className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 rounded border bg-[var(--to-surface)] px-3 py-2"
        style={{ borderColor: "var(--to-border)" }}
      >
        <div className="text-xs text-[var(--to-ink-muted)]">
          Page {((query.pageIndex ?? 0) + 1).toString()}
          {data?.page.totalRows ? ` • ${data.page.totalRows} rows` : ""}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={query.pageSize ?? 25}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-8 rounded border bg-transparent px-2 text-xs"
            style={{ borderColor: "var(--to-border)" }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}/page
              </option>
            ))}
          </select>

          <button
            onClick={() => setPage(Math.max(0, (query.pageIndex ?? 0) - 1))}
            className="h-8 rounded border px-2 text-xs font-medium"
            style={{ borderColor: "var(--to-border)" }}
            disabled={(query.pageIndex ?? 0) === 0}
          >
            Prev
          </button>
          <button
            onClick={() => setPage((query.pageIndex ?? 0) + 1)}
            className="h-8 rounded border px-2 text-xs font-medium"
            style={{ borderColor: "var(--to-border)" }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}