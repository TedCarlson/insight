// apps/web/src/components/OrgSelector.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/state/org";

function orgLabel(o: any): string {
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
  const router = useRouter();
  const { orgs, orgsLoading, orgsError, selectedOrgId, setSelectedOrgId } = useOrg();

  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const normalized = useMemo(() => {
    return (orgs ?? []).map((o: any, idx: number) => {
      const id = orgId(o);
      const text = orgLabel(o);
      const key = id ? `org-${id}` : `org-fallback-${idx}-${text}`;
      return { raw: o, id, key, text };
    });
  }, [orgs]);

  if (orgsLoading) {
    return <div className="text-sm text-[var(--to-ink-muted)]">Loading {label} details…</div>;
  }
  if (orgsError) {
    return <div className="text-sm text-[var(--to-danger)]">{label} load error: {orgsError}</div>;
  }

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

  const currentValue = selectedOrgId ?? "";
  const hasValidSelection = normalized.some((o) => o.id === currentValue);

  async function persistSelection(id: string | null) {
    setSaving(true);
    setSaveErr(null);
    try {
      const res = await fetch("/api/profile/select-org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selected_pc_org_id: id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to save org selection");

      // Force server components (Leadership, Admin, etc.) to re-read server truth
      router.refresh();
    } catch (e: any) {
      setSaveErr(e?.message ?? "Failed to save selection");
    } finally {
      setSaving(false);
    }
  }

  return (
    <label className="flex items-center gap-2">
      <span className="text-sm text-[var(--to-ink-muted)]">{label}</span>

      <div className="flex flex-col">
        <select
          className="border rounded px-2 py-1 bg-[var(--to-surface)]"
          style={{ borderColor: "var(--to-border)" }}
          value={hasValidSelection ? currentValue : ""}
          onChange={async (e) => {
            const next = e.target.value || null;

            // Update client immediately (UI feels responsive)
            setSelectedOrgId(next);

            // Persist server truth + refresh
            await persistSelection(next);
          }}
          aria-label={label}
          disabled={saving}
        >
          {!hasValidSelection ? (
            <option value="" disabled>
              Select an organization…
            </option>
          ) : null}

          {normalized.map(({ key, id, text }, idx) => {
            const value = id ?? "";
            const disabled = !id;
            return (
              <option key={key} value={value} disabled={disabled}>
                {text || `(Unnamed org ${idx + 1})`}
              </option>
            );
          })}
        </select>

        {saving ? (
          <div className="mt-1 text-[10px] text-[var(--to-ink-muted)]">Switching…</div>
        ) : saveErr ? (
          <div className="mt-1 text-[10px] text-[var(--to-danger)]">{saveErr}</div>
        ) : null}
      </div>
    </label>
  );
}