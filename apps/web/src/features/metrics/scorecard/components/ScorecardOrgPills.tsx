// RUN THIS
// Replace the entire file:
// apps/web/src/features/metrics/scorecard/components/ScorecardOrgPills.tsx

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type OrgPill = {
  pc_org_id: string;
  label: string;
  tech_id: string | null;
  is_selected: boolean;
};

export default function ScorecardOrgPills(props: { personId: string; options?: OrgPill[] | null }) {
  const router = useRouter();
  const options = useMemo(() => (props.options ?? []).filter(Boolean), [props.options]);

  const [busyOrgId, setBusyOrgId] = useState<string | null>(null);

  async function selectOrg(pc_org_id: string) {
    // prevent double-click spam
    if (busyOrgId) return;

    const current = options.find((o) => o.is_selected)?.pc_org_id ?? null;
    if (current === pc_org_id) return;

    try {
      setBusyOrgId(pc_org_id);

      const res = await fetch("/api/profile/select-org", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ selected_pc_org_id: pc_org_id }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? `select-org failed (${res.status})`);
      }

      // Server payload is scoped by requireSelectedPcOrgServer(), so refresh is the “switch”
      router.refresh();
    } finally {
      setBusyOrgId(null);
    }
  }

  if (!options.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {options.map((opt) => {
        const isSelected = !!opt.is_selected;
        const isBusy = busyOrgId === opt.pc_org_id;

        return (
          <button
            key={opt.pc_org_id}
            type="button"
            onClick={() => selectOrg(opt.pc_org_id)}
            disabled={isBusy}
            className={[
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm",
              "transition",
              isSelected ? "bg-muted font-medium" : "bg-background hover:bg-muted/50",
              isBusy ? "opacity-60" : "",
            ].join(" ")}
            title={opt.tech_id ? `Tech ID: ${opt.tech_id}` : "No tech assignment for this org"}
          >
            <span>{opt.label}</span>
            {opt.tech_id ? <span className="text-muted-foreground">• {opt.tech_id}</span> : null}
          </button>
        );
      })}
    </div>
  );
}