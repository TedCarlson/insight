// apps/web/src/components/OrgSelector.tsx
"use client";

import React from "react";
import { useOrg } from "@/state/org";

function orgLabel(o: any): string {
  // Be resilient to naming differences coming back from SQL
  const name =
    o?.org_name ??
    o?.name ??
    o?.pc_org_name ??
    o?.display_name ??
    o?.org_slug ??
    o?.slug ??
    null;

  const role = o?.role_label ?? o?.role ?? null;

  const base = name ?? "(unnamed org)";
  return role ? `${base} — ${role}` : base;
}

export function OrgSelector({ label = "Organization" }: { label?: string }) {
  const { orgs, orgsLoading, orgsError, selectedOrgId, setSelectedOrgId } = useOrg();

  if (orgsLoading) return <div className="text-sm text-[var(--to-ink-muted)]">Loading organizations…</div>;
  if (orgsError) return <div className="text-sm text-[var(--to-danger)]">Org load error: {orgsError}</div>;
  if (!orgs.length) return <div className="text-sm text-[var(--to-ink-muted)]">No organizations available.</div>;

  // If user only has one org, render a simple label instead of an empty-feeling dropdown
  if (orgs.length === 1) {
    const o = orgs[0] as any;
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--to-ink-muted)]">{label}</span>
        <span
          className="rounded border px-2 py-1 text-sm bg-[var(--to-surface)]"
          style={{ borderColor: "var(--to-border)" }}
          title={o?.pc_org_id ?? ""}
        >
          {orgLabel(o)}
        </span>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-[var(--to-ink-muted)]">{label}</span>
      <select
        className="border rounded px-2 py-1 bg-[var(--to-surface)]"
        style={{ borderColor: "var(--to-border)" }}
        value={selectedOrgId ?? ""}
        onChange={(e) => setSelectedOrgId(e.target.value || null)}
        aria-label={label}
      >
        {orgs.map((o: any) => (
          <option key={o.pc_org_id ?? o.id} value={o.pc_org_id ?? o.id}>
            {orgLabel(o)}
          </option>
        ))}
      </select>
    </label>
  );
}
