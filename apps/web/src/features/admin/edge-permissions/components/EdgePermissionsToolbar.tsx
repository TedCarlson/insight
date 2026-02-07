"use client";

import type { EdgeScope, PcOrgOption } from "../types";
import { useMemo, useState } from "react";

export function EdgePermissionsToolbar(props: {
  search: string;
  onSearch: (v: string) => void;

  lob: string;
  onLob: (v: string) => void;

  scope: EdgeScope;
  onScope: (v: EdgeScope) => void;

  pcOrgId: string | null;
  pcOrgs: PcOrgOption[];
  onPcOrgId: (v: string | null) => void;

  loading: boolean;
  onRefresh: () => void;
}) {
  const {
    search,
    onSearch,
    lob,
    onLob,
    scope,
    onScope,
    pcOrgId,
    pcOrgs,
    onPcOrgId,
    loading,
    onRefresh,
  } = props;

  // drift-proof LOB input (no hardcoded list)
  const [lobDraft, setLobDraft] = useState(lob);

  const lobLabel = useMemo(() => (lob && lob !== "ALL" ? lob : "All LOBs"), [lob]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-[var(--to-ink-muted)]">Search users</label>
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="name, email…"
          className="h-9 w-64 rounded border bg-transparent px-3 text-sm"
          style={{ borderColor: "var(--to-border)" }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-[var(--to-ink-muted)]">LOB filter</label>
        <div className="flex items-center gap-2">
          <select
            value={lob === "ALL" ? "ALL" : "CUSTOM"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "ALL") onLob("ALL");
              else onLob(lobDraft || "ALL");
            }}
            className="h-9 rounded border bg-transparent px-2 text-sm"
            style={{ borderColor: "var(--to-border)" }}
          >
            <option value="ALL">All</option>
            <option value="CUSTOM">Specific…</option>
          </select>

          <input
            value={lobDraft}
            onChange={(e) => setLobDraft(e.target.value)}
            onBlur={() => {
              if (lob !== "ALL") onLob(lobDraft || "ALL");
            }}
            placeholder={lobLabel}
            className="h-9 w-48 rounded border bg-transparent px-3 text-sm"
            style={{ borderColor: "var(--to-border)" }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-[var(--to-ink-muted)]">Scope</label>
        <select
          value={scope}
          onChange={(e) => {
            const v = e.target.value as EdgeScope;
            onScope(v);
          }}
          className="h-9 rounded border bg-transparent px-2 text-sm"
          style={{ borderColor: "var(--to-border)" }}
        >
          <option value="global">Global (Admin)</option>
          <option value="pc_org">PC-ORG (Delegation)</option>
        </select>
      </div>

      {scope === "pc_org" ? (
        <div className="flex flex-col gap-1">
          <label className="text-xs text-[var(--to-ink-muted)]">PC-ORG</label>
          <select
            value={pcOrgId ?? ""}
            onChange={(e) => onPcOrgId(e.target.value || null)}
            className="h-9 min-w-[260px] rounded border bg-transparent px-2 text-sm"
            style={{ borderColor: "var(--to-border)" }}
          >
            <option value="">Select PC-ORG…</option>
            {pcOrgs.map((o) => (
              <option key={o.pc_org_id} value={o.pc_org_id}>
                {o.pc_org_name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <button
        onClick={onRefresh}
        disabled={loading}
        className="h-9 rounded border px-3 text-sm font-medium disabled:opacity-60"
        style={{ borderColor: "var(--to-border)" }}
      >
        {loading ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}