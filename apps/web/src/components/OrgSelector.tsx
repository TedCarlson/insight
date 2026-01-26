// apps/web/src/components/OrgSelector.tsx
"use client";

import React, { useMemo } from "react";
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

function orgId(o: any): string | null {
  const raw = o?.pc_org_id ?? o?.id ?? o?.org_id ?? null;
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  return s.length ? s : null;
}

export function OrgSelector({ label = "PC" }: { label?: string }) {
  const { orgs, orgsLoading, orgsError, selectedOrgId, setSelectedOrgId } = useOrg();

  // Normalize orgs once for safe rendering
  const normalized = useMemo(() => {
    return (orgs ?? []).map((o: any, idx: number) => {
      const id = orgId(o);
      const text = orgLabel(o);
      // Guaranteed unique key even if id missing/duplicated
      const key = id ? `org-${id}` : `org-fallback-${idx}-${text}`;
      return { raw: o, id, key, text };
    });
  }, [orgs]);

  // Loading / error states
  if (orgsLoading) {
    return <div className="text-sm text-[var(--to-ink-muted)]">Loading {label} details…</div>;
  }
  if (orgsError) {
    return <div className="text-sm text-[var(--to-danger)]">{label} load error: {orgsError}</div>;
  }

  // No orgs: render a disabled select so layout doesn't jump and UI is explicit
  if (normalized.length === 0) {
    return (
      <label className="flex items-center gap-2">
        <span className="text-sm text-[var(--to-ink-muted)]">{label}</span>
        <select
          className="border rounded px-2 py-1 bg-[var(--to-surface)] opacity-70"
          style={{ borderColor: "var(--to-border)" }}
          value=""
          disabled
          aria-label={label}
        >
          <option value="">No organizations</option>
        </select>
      </label>
    );
  }

  // Single org: show a pill/label instead of a dropdown
  if (normalized.length === 1) {
    const one = normalized[0];
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-[var(--to-ink-muted)]">{label}</span>
        <span
          className="rounded border px-2 py-1 text-sm bg-[var(--to-surface)]"
          style={{ borderColor: "var(--to-border)" }}
          title={one.id ?? ""}
        >
          {one.text}
        </span>
      </div>
    );
  }

  // Multi-org: dropdown with a safe placeholder if nothing selected yet
  const currentValue = selectedOrgId ?? "";
  const hasValidSelection = normalized.some((o) => o.id === currentValue);

  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-[var(--to-ink-muted)]">{label}</span>
      <select
        className="border rounded px-2 py-1 bg-[var(--to-surface)]"
        style={{ borderColor: "var(--to-border)" }}
        value={hasValidSelection ? currentValue : ""}
        onChange={(e) => setSelectedOrgId(e.target.value || null)}
        aria-label={label}
      >
        {!hasValidSelection ? (
          <option value="" disabled>
            Select an organization…
          </option>
        ) : null}

        {normalized.map(({ key, id, text }, idx) => {
          // If id is missing (shouldn't happen often), we still render but make it unselectable.
          const value = id ?? "";
          const disabled = !id;

          return (
            <option key={key} value={value} disabled={disabled}>
              {text || `(Unnamed org ${idx + 1})`}
            </option>
          );
        })}
      </select>
    </label>
  );
}
