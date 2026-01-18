"use client";

import * as React from "react";
import { createClient } from "@/app/(prod)/_shared/supabase";

type PcOrgRow = {
  pc_org_id: string;
  pc_org_name: string | null;
};

export function OrgContextSelector() {
  const supabase = React.useMemo(() => createClient(), []);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [pcOrgs, setPcOrgs] = React.useState<PcOrgRow[]>([]);
  const [selected, setSelected] = React.useState<string>("__none__");

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      // 1) current selected org from profile (server route)
      const res = await fetch("/api/profile/select-org", { cache: "no-store" });
      const json = await res.json();
      if (json?.ok) setSelected(json.selected_pc_org_id ?? "__none__");

      // 2) org options (admin view; until RLS is active this is fine)
      const { data, error } = await supabase
        .from("pc_org_admin_v")
        .select("pc_org_id, pc_org_name")
        .order("pc_org_name", { ascending: true });

      if (error) throw error;
      setPcOrgs((data ?? []) as PcOrgRow[]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const onChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelected(value);

    const next = value === "__none__" ? null : value;

    setSaving(true);
    try {
      const res = await fetch("/api/profile/select-org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selected_pc_org_id: next }),
      });

      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error ?? "Failed to update selected org");

      // refresh server-rendered data for the current route
      window.location.reload();
    } catch (err) {
      console.error(err);
      // revert selection on error
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-[var(--to-ink-muted)]">Org</div>

      <select
        className="h-10 w-[280px] rounded border bg-transparent px-3 text-sm"
        style={{ borderColor: "var(--to-border)" }}
        disabled={loading || saving}
        value={selected}
        onChange={onChange}
      >
        <option value="__none__">{loading ? "Loading…" : "No org selected"}</option>
        {pcOrgs.map((o) => (
          <option key={o.pc_org_id} value={o.pc_org_id}>
            {o.pc_org_name ?? o.pc_org_id}
          </option>
        ))}
      </select>
    </div>
  );
}
